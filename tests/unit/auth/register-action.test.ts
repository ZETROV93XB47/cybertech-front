// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerUserAction } from "@/features/auth/actions";
import { INITIAL_REGISTER_STATE } from "@/features/auth/register-state";
import { RegisterStatus } from "@/lib/enums/register-status";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const incoming = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(incoming.headers) }));
vi.mock("@/lib/auth/config", () => ({ signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }));

const PASSWORD = "Sup3rSecret!";

const FORM = {
  email: "camille@example.com",
  firstName: "Camille",
  lastName: "Testeur",
  sex: "F",
  phoneNumber: "+33600000000",
  favoriteCommunicationChanel: "SMS",
  street: "1 rue du Test",
  city: "Paris",
  zipCode: "75001",
  country: "France",
  birthDate: "1990-05-17",
  password: PASSWORD,
};

function formData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  Object.entries({ ...FORM, ...overrides }).forEach(([name, value]) => {
    data.set(name, value);
  });
  return data;
}

function mockRegister(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  const calls: { body: unknown; forwardedFor: string | null }[] = [];
  server.use(
    http.post(`${API}/user/register`, async ({ request }) => {
      calls.push({
        body: await request.json(),
        forwardedFor: request.headers.get("X-Forwarded-For"),
      });
      return HttpResponse.json(body, { status, headers });
    }),
  );
  return calls;
}

beforeEach(() => {
  incoming.headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
});

describe("registerUserAction", () => {
  it("creates the account, forwards the browser IP and never logs the password", async () => {
    const calls = mockRegister(201, {
      id: "01a13475-7bff-70a3-82c1-7d4f4a5ed7ef",
      email: FORM.email,
      username: "camille.testeur",
    });
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData());
    expect(state).toMatchObject({ status: RegisterStatus.SUCCESS, email: FORM.email });
    expect(calls[0]?.forwardedFor).toBe("203.0.113.7");
    expect(calls[0]?.body).toMatchObject({
      birthDate: "1990-05-17T00:00:00",
      favoriteCommunicationChanel: "SMS",
    });
    expect(allLoggedText()).not.toContain(PASSWORD);
    expect(allLoggedText()).not.toContain(FORM.email);
  });

  it("refuses an invalid form without calling the backend, and never sends the password back", async () => {
    const calls = mockRegister(201, {});
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData({ email: "nope" }));
    expect(calls).toHaveLength(0);
    expect(state.fieldErrors.email).toBe("Vérifie ton adresse email.");
    expect(state.values).not.toHaveProperty("password");
    expect(state.values.firstName).toBe("Camille");
  });

  it("maps backend fieldErrors onto the fields, in French", async () => {
    mockRegister(400, {
      ...errorBody("INVALID_REQUEST", 400),
      fieldErrors: [
        { field: "zipCode", message: "Zip code cannot be blank" },
        { field: "bankCardCreationRequestDto.number", message: "whatever" },
      ],
    });
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData());
    expect(state.fieldErrors).toEqual({ zipCode: "Ce champ est requis." });
    expect(state.formError).toBe("Certains champs sont à corriger.");
  });

  it("puts « Un compte existe déjà » on the email field", async () => {
    mockRegister(409, errorBody("USER_ALREADY_EXISTS", 409));
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData());
    expect(state.fieldErrors.email).toBe("Un compte existe déjà avec cet email.");
  });

  it("tells how long to wait when rate limited", async () => {
    mockRegister(429, errorBody("TOO_MANY_REQUESTS", 429), { "Retry-After": "42" });
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData());
    expect(state).toMatchObject({
      retryAfterSeconds: 42,
      formError: "Doucement ! Réessaie dans 42 s.",
    });
  });

  it("shows the unavailable message when the backend is down", async () => {
    server.use(http.post(`${API}/user/register`, () => HttpResponse.error()));
    const state = await registerUserAction(INITIAL_REGISTER_STATE, formData());
    expect(state.formError).toBe(
      "On n'arrive pas à joindre la boutique. Réessaie dans un instant.",
    );
  });
});
