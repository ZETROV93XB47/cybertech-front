// @vitest-environment node
/**
 * « Mon profil » (feature 003 US4, T055): profile schemas, view, `updateMe` endpoint and the
 * `updateProfile` Server Action.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateProfile } from "@/features/account/actions";
import { INITIAL_PROFILE_STATE } from "@/features/account/profile-state";
import { toAddressLine, toProfileView } from "@/features/account/profile-view";
import { updateMe } from "@/lib/api/endpoints/users";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { ProfileStatus } from "@/lib/enums/profile";
import { ProfileUpdateSchema, UserProfileSchema, toUserSelfUpdateBody } from "@/lib/schemas/user";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

const TOKEN = "secret-access-token";
const PHONE = "+33 6 12 34 56 78";
const STREET = "12 rue de la Paix";

const PROFILE = {
  uuid: "01a13475-7bff-70a3-82c1-7d4f4a5ed7ef",
  email: "camille@example.com",
  firstName: "Camille",
  lastName: "Testeur",
  username: "camille.testeur",
  sex: "F",
  address: `${STREET}, 75002 Paris, France`,
  birthDate: "1990-01-01T00:00:00.000+00:00",
  role: "USER",
};

const FORM = {
  firstName: "Camille",
  lastName: "Testeur",
  phoneNumber: "",
  street: STREET,
  zipCode: "75002",
  city: "Lyon",
  country: "France",
};

/**
 * Builds the submitted form.
 *
 * @param overrides - Values replacing the defaults.
 * @returns The form data.
 */
function formData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  Object.entries({ ...FORM, ...overrides }).forEach(([name, value]) => {
    data.set(name, value);
  });
  return data;
}

/**
 * Mocks `PATCH /user/me` and records the bodies received.
 *
 * @param status - HTTP status answered.
 * @param body - JSON answered.
 * @returns The recorded calls.
 */
function mockPatch(
  status: number,
  body: Record<string, unknown>,
): { body: unknown; auth: string | null }[] {
  const calls: { body: unknown; auth: string | null }[] = [];
  server.use(
    http.patch(`${API}/user/me`, async ({ request }) => {
      calls.push({ body: await request.json(), auth: request.headers.get("Authorization") });
      return HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue(TOKEN);
  cache.revalidatePath.mockClear();
});

describe("UserProfileSchema and toProfileView", () => {
  it("keeps the profile fields and splits the address", () => {
    const view = toProfileView(UserProfileSchema.parse(PROFILE));
    expect(view).toEqual({
      firstName: "Camille",
      lastName: "Testeur",
      email: "camille@example.com",
      username: "camille.testeur",
      address: { street: STREET, zipCode: "75002", city: "Paris", country: "France" },
      addressLine: `${STREET}, 75002 Paris, France`,
    });
  });

  it("accepts a profile without address and never shows a « null » line", () => {
    const view = toProfileView(UserProfileSchema.parse({ ...PROFILE, address: null }));
    expect(view.addressLine).toBeNull();
    expect(toAddressLine({ street: "", zipCode: "", city: "Paris", country: "" })).toBe("Paris");
    expect(
      toProfileView(UserProfileSchema.parse({ ...PROFILE, address: "null, null null, null" }))
        .addressLine,
    ).toBeNull();
  });
});

describe("ProfileUpdateSchema", () => {
  it("trims the names and omits the empty phone and address fields", () => {
    const parsed = ProfileUpdateSchema.parse({
      ...FORM,
      firstName: "  Camille ",
      street: "  ",
      city: "",
    });
    expect(toUserSelfUpdateBody(parsed)).toEqual({
      firstName: "Camille",
      lastName: "Testeur",
      zipCode: "75002",
      country: "France",
    });
  });

  it("refuses a one-letter or a 51-letter name, and a malformed phone", () => {
    const result = ProfileUpdateSchema.safeParse({
      ...FORM,
      firstName: "C",
      lastName: "x".repeat(51),
      phoneNumber: "call me",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["firstName", "lastName", "phoneNumber"]));
  });

  it("sends a typed phone number", () => {
    expect(
      toUserSelfUpdateBody(ProfileUpdateSchema.parse({ ...FORM, phoneNumber: PHONE })),
    ).toMatchObject({
      phoneNumber: PHONE,
    });
  });
});

describe("updateMe", () => {
  it("patches /user/me with the token and logs field names only", async () => {
    const calls = mockPatch(200, PROFILE);
    const profile = await updateMe(
      ProfileUpdateSchema.parse({ ...FORM, phoneNumber: PHONE }),
      TOKEN,
    );
    expect(profile.username).toBe("camille.testeur");
    expect(calls[0]?.auth).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]?.body).toEqual({
      firstName: "Camille",
      lastName: "Testeur",
      phoneNumber: PHONE,
      street: STREET,
      zipCode: "75002",
      city: "Lyon",
      country: "France",
    });
    const logs = allLoggedText();
    expect(logs).toContain("Profile updated");
    for (const secret of [TOKEN, PHONE, STREET, "Lyon", "camille@example.com"]) {
      expect(logs).not.toContain(secret);
    }
  });

  it("maps USER_NOT_FOUND to not-found", async () => {
    mockPatch(404, errorBody("USER_NOT_FOUND", 404));
    const error: unknown = await updateMe(ProfileUpdateSchema.parse(FORM), TOKEN).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ frontCode: FrontErrorCode.NOT_FOUND });
  });
});

describe("updateProfile", () => {
  it("saves, revalidates the profile and the checkout, and empties the phone", async () => {
    const calls = mockPatch(200, PROFILE);
    const state = await updateProfile(INITIAL_PROFILE_STATE, formData({ phoneNumber: PHONE }));
    expect(state.status).toBe(ProfileStatus.SUCCESS);
    expect(state.saveCount).toBe(1);
    expect(state.values.phoneNumber).toBeUndefined();
    expect(state.values.city).toBe("Lyon");
    expect(calls).toHaveLength(1);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/account/profile");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/checkout");
  });

  it("refuses an invalid form without calling the backend", async () => {
    const calls = mockPatch(200, PROFILE);
    const state = await updateProfile(INITIAL_PROFILE_STATE, formData({ firstName: "C" }));
    expect(state.status).toBe(ProfileStatus.ERROR);
    expect(state.fieldErrors.firstName).toBe("Entre 2 et 50 caractères.");
    expect(state.values.firstName).toBe("C");
    expect(calls).toHaveLength(0);
  });

  it("maps the backend field errors onto the fields", async () => {
    mockPatch(400, {
      ...errorBody("INVALID_REQUEST", 400),
      fieldErrors: [{ field: "lastName", message: "size must be between 2 and 50" }],
    });
    const state = await updateProfile(INITIAL_PROFILE_STATE, formData());
    expect(state.fieldErrors).toEqual({ lastName: "Entre 2 et 50 caractères." });
    expect(state.formError).toBe("Vérifie les champs signalés.");
  });

  it("keeps the typed values and offers to sign in again when the session expired", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({ status: 401, frontCode: FrontErrorCode.UNAUTHENTICATED, message: "expired" }),
    );
    const state = await updateProfile(INITIAL_PROFILE_STATE, formData({ city: "Marseille" }));
    expect(state).toMatchObject({ status: ProfileStatus.ERROR, needsSignIn: true });
    expect(state.values.city).toBe("Marseille");
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it("explains a missing profile and a rate limit", async () => {
    mockPatch(404, errorBody("USER_NOT_FOUND", 404));
    expect((await updateProfile(INITIAL_PROFILE_STATE, formData())).formError).toMatch(/profil/);
    server.use(
      http.patch(`${API}/user/me`, () =>
        HttpResponse.json(errorBody("TOO_MANY_REQUESTS", 429), {
          status: 429,
          headers: { "Retry-After": "12" },
        }),
      ),
    );
    const limited = await updateProfile(INITIAL_PROFILE_STATE, formData());
    expect(limited).toMatchObject({ retryAfterSeconds: 12 });
    expect(limited.formError).toContain("12 s");
  });
});
