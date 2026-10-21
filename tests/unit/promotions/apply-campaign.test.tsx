/**
 * Feature 004, US4 (T029) — « Appliquer à mon panier »: the key is stored for the cart, the
 * outcome is announced politely, and no amount is ever shown.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as discountStorage from "@/features/checkout/discount-storage";
import { ApplyCampaignButton } from "@/features/promotions/components/ApplyCampaignButton";
import { DISCOUNT_STORAGE_KEY } from "@/lib/constants/storage-keys";

import { renderWithProviders } from "../../helpers/providers";

interface FakeSession {
  data: { error?: string } | null;
  status: string;
}

const session = vi.hoisted((): { value: FakeSession } => ({
  value: { data: null, status: "unauthenticated" },
}));

vi.mock("next-auth/react", () => ({ useSession: () => session.value }));

afterEach(() => {
  window.sessionStorage.clear();
  session.value = { data: null, status: "unauthenticated" };
});

/**
 * Renders the button for BLACK_FRIDAY and clicks it.
 *
 * @returns The polite live region.
 */
async function applyBlackFriday(): Promise<HTMLElement> {
  renderWithProviders(
    <ApplyCampaignButton campaignKey="BLACK_FRIDAY" campaignName="Black Friday" />,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Appliquer à mon panier" }));
  return screen.getByRole("status");
}

describe("ApplyCampaignButton", () => {
  it("signed in: stores the key and announces it with a link to the cart", async () => {
    session.value = { data: {}, status: "authenticated" };
    const write = vi.spyOn(discountStorage, "writeDiscountKey");
    const status = await applyBlackFriday();
    expect(write).toHaveBeenCalledWith(window.sessionStorage, "BLACK_FRIDAY");
    expect(window.sessionStorage.getItem(DISCOUNT_STORAGE_KEY)).toBe("BLACK_FRIDAY");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Black Friday est sélectionnée");
    expect(within(status).getByRole("link", { name: "Voir mon panier" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  it("visitor: keeps the key and offers to sign in, back to the cart", async () => {
    const status = await applyBlackFriday();
    expect(window.sessionStorage.getItem(DISCOUNT_STORAGE_KEY)).toBe("BLACK_FRIDAY");
    expect(status).toHaveTextContent("Black Friday est gardée pour toi");
    const signIn = within(status).getByRole("link", { name: "Me connecter" });
    expect(signIn.getAttribute("href")).toMatch(/^\/login\?callbackUrl=%2Fcart/);
  });

  it("an expired session counts as a visitor", async () => {
    session.value = { data: { error: "RefreshAccessTokenError" }, status: "authenticated" };
    const status = await applyBlackFriday();
    expect(within(status).getByRole("link", { name: "Me connecter" })).toBeVisible();
  });

  it("blocked storage: tells to type the key in the cart", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const status = await applyBlackFriday();
    expect(status).toHaveTextContent("Ton navigateur bloque l'enregistrement de la réduction");
    expect(within(status).queryByRole("link")).not.toBeInTheDocument();
  });

  it("is disabled while the session is read", () => {
    session.value = { data: null, status: "loading" };
    renderWithProviders(
      <ApplyCampaignButton campaignKey="BLACK_FRIDAY" campaignName="Black Friday" />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("never shows an amount", async () => {
    session.value = { data: {}, status: "authenticated" };
    const status = await applyBlackFriday();
    expect(status.textContent).not.toMatch(/€|%/);
  });
});
