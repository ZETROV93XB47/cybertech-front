// @vitest-environment node
/**
 * « Ma carte » (feature 003 US5, T063): card schemas, expiry rules, network detection, card
 * view, card endpoints and the update / delete Server Actions. Nothing about the card is ever
 * logged.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2, §2 bis
 */
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteBankCard, updateBankCard } from "@/features/account/actions";
import { detectCardNetwork, formatCardDigits, cardDigits } from "@/features/account/card-network";
import { INITIAL_CARD_UPDATE_STATE } from "@/features/account/card-state";
import { expiryYearOptions, toCardView } from "@/features/account/card-view";
import {
  deleteBankCard as deleteEndpoint,
  getBankCard,
  updateBankCard as updateEndpoint,
} from "@/lib/api/endpoints/bank-card";
import { BankCardField, BankCardType, CardFormStatus } from "@/lib/enums/bank-card";
import {
  BankCardAddBodySchema,
  BankCardSchema,
  BankCardUpdateSchema,
  isExpiryPast,
} from "@/lib/schemas/bank-card";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

const TOKEN = "secret-access-token";
const HOLDER = "Camille Testeur";
const NOW = new Date("2026-10-20T10:00:00Z");

const CARD = {
  uuid: "01a13475-0000-7000-8000-0000000000c1",
  cardHolderName: HOLDER,
  maskedNumber: "**** **** **** 4242",
  expiryDate: "12/2030",
  cardType: "VISA",
  userUuid: "01a13475-0000-7000-8000-000000000002",
};

/**
 * Builds the submitted update form.
 *
 * @param values - Holder, month and year.
 * @returns The form data.
 */
function updateForm(holder: string, month: string, year: string): FormData {
  const data = new FormData();
  data.set(BankCardField.CARD_HOLDER_NAME, holder);
  data.set(BankCardField.EXPIRY_MONTH, month);
  data.set(BankCardField.EXPIRY_YEAR, year);
  return data;
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  guards.getAccessTokenOrThrow.mockResolvedValue(TOKEN);
  cache.revalidatePath.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("card schemas", () => {
  it("reads a masked card", () => {
    expect(BankCardSchema.parse(CARD).maskedNumber).toBe("**** **** **** 4242");
    expect(BankCardSchema.safeParse({ ...CARD, expiryDate: "2030-12" }).success).toBe(false);
    expect(BankCardSchema.safeParse({ ...CARD, cardType: "JCB" }).success).toBe(false);
  });

  it("treats a card as valid until the end of its expiry month, in the shop time zone", () => {
    expect(isExpiryPast("10/2026", NOW)).toBe(false);
    expect(isExpiryPast("09/2026", NOW)).toBe(true);
    expect(isExpiryPast("01/2027", NOW)).toBe(false);
    // 31 Oct 23:30 UTC is already November in Paris.
    expect(isExpiryPast("10/2026", new Date("2026-10-31T23:30:00Z"))).toBe(true);
  });

  it("validates the update: holder trimmed and required, expiry MM/YYYY not past", () => {
    expect(
      BankCardUpdateSchema.parse({ cardHolderName: "  Camille  ", expiryDate: "12/2030" }),
    ).toEqual({ cardHolderName: "Camille", expiryDate: "12/2030" });
    expect(
      BankCardUpdateSchema.safeParse({ cardHolderName: " ", expiryDate: "12/2030" }).success,
    ).toBe(false);
    expect(
      BankCardUpdateSchema.safeParse({ cardHolderName: HOLDER, expiryDate: "01/2020" }).success,
    ).toBe(false);
  });

  it("validates the add body strictly and removes the spaces of the number", () => {
    const body = {
      cardHolderName: HOLDER,
      cardNumber: "1111 1111 1111 1111",
      expiryDate: "12/2030",
      cardType: "OTHER",
    };
    expect(BankCardAddBodySchema.parse(body).cardNumber).toBe("1111111111111111");
    expect(BankCardAddBodySchema.safeParse({ ...body, cvc: "123" }).success).toBe(false);
    expect(BankCardAddBodySchema.safeParse({ ...body, cardNumber: "111111111111" }).success).toBe(
      false,
    );
    expect(
      BankCardAddBodySchema.safeParse({ ...body, cardNumber: "1111 abcd 1111 1111" }).success,
    ).toBe(false);
  });
});

describe("card network and number display", () => {
  it.each([
    ["4242424242424242", BankCardType.VISA],
    ["5555555555554444", BankCardType.MASTERCARD],
    ["2223003122003222", BankCardType.MASTERCARD],
    ["378282246310005", BankCardType.AMERICAN_EXPRESS],
    ["6011111111111117", BankCardType.DISCOVER],
    ["6445644564456445", BankCardType.DISCOVER],
    ["6500000000000002", BankCardType.DISCOVER],
    ["1111111111111111", BankCardType.OTHER],
    ["", BankCardType.OTHER],
  ])("%s is %s", (digits, network) => {
    expect(detectCardNetwork(digits)).toBe(network);
  });

  it("keeps digits only, at most 19, shown in groups of four", () => {
    expect(cardDigits("1111-1111 1111a1111 1111 1111 1111")).toBe("1111111111111111111");
    expect(formatCardDigits("111111111")).toBe("1111 1111 1");
  });
});

describe("card view", () => {
  it("splits the expiry and keeps the last four digits only", () => {
    expect(toCardView(BankCardSchema.parse(CARD))).toEqual({
      network: BankCardType.VISA,
      lastDigits: "4242",
      holder: HOLDER,
      expiryMonth: "12",
      expiryYear: "2030",
    });
  });

  it("offers the coming years, plus the saved year when it is older", () => {
    const years = expiryYearOptions(NOW, "2024");
    expect(years[0]).toBe("2024");
    expect(years[1]).toBe("2026");
  });
});

describe("card endpoints", () => {
  it("reads no card as null", async () => {
    server.use(
      http.get(`${API}/bank-card/get`, () =>
        HttpResponse.json(errorBody("BANK_CARD_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    await expect(getBankCard(TOKEN)).resolves.toBeNull();
  });

  it("updates the holder and the expiry, logging the network only", async () => {
    const calls: unknown[] = [];
    server.use(
      http.put(`${API}/bank-card/update`, async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json(CARD);
      }),
    );
    await updateEndpoint({ cardHolderName: HOLDER, expiryDate: "12/2030" }, TOKEN);
    expect(calls[0]).toEqual({ cardHolderName: HOLDER, expiryDate: "12/2030" });
    const logs = allLoggedText();
    for (const secret of [TOKEN, HOLDER, "4242", "12/2030"]) {
      expect(logs).not.toContain(secret);
    }
  });

  it("counts a missing card as deleted", async () => {
    server.use(
      http.delete(`${API}/bank-card/delete`, () =>
        HttpResponse.json(errorBody("BANK_CARD_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    await expect(deleteEndpoint(TOKEN)).resolves.toBe(false);
  });
});

describe("updateBankCard action", () => {
  it("saves and revalidates the card page and the checkout", async () => {
    server.use(http.put(`${API}/bank-card/update`, () => HttpResponse.json(CARD)));
    const state = await updateBankCard(INITIAL_CARD_UPDATE_STATE, updateForm(HOLDER, "12", "2030"));
    expect(state.status).toBe(CardFormStatus.SUCCESS);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/account/card");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/checkout");
  });

  it("refuses a past expiry on the field without calling the backend", async () => {
    const state = await updateBankCard(INITIAL_CARD_UPDATE_STATE, updateForm(HOLDER, "01", "2020"));
    expect(state.fieldErrors[BankCardField.EXPIRY_MONTH]).toMatch(/date est passée/);
    expect(state.values?.holder).toBe(HOLDER);
  });

  it("maps BANK_CARD_EXPIRED onto the expiry field and BANK_CARD_NOT_FOUND to the no-card text", async () => {
    server.use(
      http.put(`${API}/bank-card/update`, () =>
        HttpResponse.json(errorBody("BANK_CARD_EXPIRED", 400), { status: 400 }),
      ),
    );
    const expired = await updateBankCard(
      INITIAL_CARD_UPDATE_STATE,
      updateForm(HOLDER, "12", "2030"),
    );
    expect(expired.fieldErrors[BankCardField.EXPIRY_MONTH]).toMatch(/date est passée/);
    server.use(
      http.put(`${API}/bank-card/update`, () =>
        HttpResponse.json(errorBody("BANK_CARD_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    const missing = await updateBankCard(
      INITIAL_CARD_UPDATE_STATE,
      updateForm(HOLDER, "12", "2030"),
    );
    expect(missing.formError).toMatch(/Aucune carte/);
  });

  it("keeps the typed values and offers to sign in again when the session expired", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    const { FrontErrorCode } = await import("@/lib/enums/error-code");
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({ status: 401, frontCode: FrontErrorCode.UNAUTHENTICATED, message: "expired" }),
    );
    const state = await updateBankCard(INITIAL_CARD_UPDATE_STATE, updateForm(HOLDER, "12", "2030"));
    expect(state.needsSignIn).toBe(true);
    expect(state.values?.holder).toBe(HOLDER);
  });
});

describe("deleteBankCard action", () => {
  it("succeeds on 204 and on an already missing card", async () => {
    server.use(
      http.delete(`${API}/bank-card/delete`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/bank-card/get`, () =>
        HttpResponse.json(errorBody("BANK_CARD_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    await expect(deleteBankCard()).resolves.toEqual({ status: CardFormStatus.SUCCESS });
    server.use(
      http.delete(`${API}/bank-card/delete`, () =>
        HttpResponse.json(errorBody("BANK_CARD_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    await expect(deleteBankCard()).resolves.toEqual({ status: CardFormStatus.SUCCESS });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/account/card");
  });

  it("says so when the card is still there after a 204 (no false success)", async () => {
    server.use(
      http.delete(`${API}/bank-card/delete`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/bank-card/get`, () => HttpResponse.json(CARD)),
    );
    await expect(deleteBankCard()).resolves.toEqual({
      status: CardFormStatus.ERROR,
      formError:
        "La suppression n'a pas abouti : ta carte est toujours enregistrée. Réessaie dans un instant.",
    });
  });
});
