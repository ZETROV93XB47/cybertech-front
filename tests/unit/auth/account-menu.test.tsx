/**
 * Header account menu (feature 003, T098): avatar with initials, panel opened on hover, click
 * and keyboard, account sections, sign-out clearing the client state, and no axe violation.
 *
 * @see specs/003-account-orders/spec.md FR-040
 */
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toAccountIdentity } from "@/features/auth/account-identity";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { ACCOUNT_MENU_ITEMS } from "@/features/account/account-sections";
import { ACCOUNT_MENU_CLOSE_DELAY_MS } from "@/lib/constants/auth";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";

import { renderWithProviders } from "../../helpers/providers";

interface FakeSession {
  data: { user: { name: string | null; email: string | null } } | null;
  status: string;
}

const session = vi.hoisted((): { value: FakeSession } => ({
  value: { data: null, status: "unauthenticated" },
}));
const pathname = vi.hoisted(() => ({ value: "/" }));
const clientState = vi.hoisted(() => ({ reset: vi.fn(), clearGuestCart: vi.fn() }));

vi.mock("next-auth/react", () => ({ useSession: () => session.value }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("@/features/auth/actions", () => ({ signOutEverywhere: vi.fn() }));
vi.mock("@/lib/query/query-client", () => ({ resetClientState: clientState.reset }));
vi.mock("@/features/cart/guest-storage", () => ({ clearGuestCart: clientState.clearGuestCart }));

const NAME = "Camille Testeur";
const EMAIL = "camille@example.com";

/** Accessible name of the avatar button. */
const AVATAR_NAME = `Compte de ${NAME}`;

/**
 * Signs the fake session in.
 *
 * @param name - Session name.
 * @param email - Session email.
 */
function signIn(name: string | null = NAME, email: string | null = EMAIL): void {
  session.value = { data: { user: { name, email } }, status: "authenticated" };
}

/**
 * The avatar button.
 *
 * @returns The button.
 */
function avatar(): HTMLElement {
  return screen.getByRole("button", { name: AVATAR_NAME });
}

/**
 * Wrapper of the avatar and its panel (receives the pointer events).
 *
 * @returns The wrapper.
 * @throws {Error} When the avatar has no parent.
 */
function menuRoot(): HTMLElement {
  const root = avatar().parentElement;
  if (root === null) {
    throw new Error("Avatar without wrapper");
  }
  return root;
}

beforeEach(() => {
  pathname.value = "/";
  signIn();
});

afterEach(() => {
  vi.useRealTimers();
  clientState.reset.mockClear();
  clientState.clearGuestCart.mockClear();
});

describe("toAccountIdentity", () => {
  it("takes the initials of the first two words and the first name", () => {
    expect(toAccountIdentity({ name: "Camille Marie Testeur", email: EMAIL })).toEqual({
      initials: "CM",
      firstName: "Camille",
      fullName: "Camille Marie Testeur",
      email: EMAIL,
    });
  });

  it("falls back to the email, then to a placeholder", () => {
    expect(toAccountIdentity({ name: null, email: EMAIL }).initials).toBe("C");
    expect(toAccountIdentity({ name: "  ", email: null }).initials).toBe("?");
    expect(toAccountIdentity(undefined).fullName).toBe("");
  });
});

describe("AccountMenu signed in", () => {
  it("shows only the avatar with the initials while closed", async () => {
    const { container } = renderWithProviders(<AccountMenu />);
    expect(avatar()).toHaveTextContent("CT");
    expect(avatar()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("account-name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("opens on click with the greeting, name, email, sections and sign-out", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AccountMenu />);
    await user.click(avatar());
    expect(avatar()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Bonjour Camille")).toBeInTheDocument();
    expect(screen.getByTestId("account-name")).toHaveTextContent(NAME);
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    for (const item of ACCOUNT_MENU_ITEMS) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("marks the current section", async () => {
    pathname.value = `${ACCOUNT_PATHS.orders}/some-order`;
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);
    await user.click(avatar());
    expect(screen.getByRole("link", { name: "Mes commandes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Ma wishlist" })).not.toHaveAttribute("aria-current");
  });

  it("opens on mouse hover and closes after the delay once the pointer leaves", () => {
    vi.useFakeTimers();
    renderWithProviders(<AccountMenu />);
    const root = menuRoot();
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    expect(screen.getByTestId("account-name")).toBeInTheDocument();
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    expect(screen.getByTestId("account-name")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(ACCOUNT_MENU_CLOSE_DELAY_MS);
    });
    expect(screen.queryByTestId("account-name")).not.toBeInTheDocument();
  });

  it("stays open when the user clicks after hovering", () => {
    vi.useFakeTimers();
    renderWithProviders(<AccountMenu />);
    const root = menuRoot();
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    fireEvent.click(avatar());
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(ACCOUNT_MENU_CLOSE_DELAY_MS);
    });
    expect(screen.getByTestId("account-name")).toBeInTheDocument();
  });

  it("opens with ArrowDown on the first link and closes with Escape back on the avatar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);
    avatar().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: ACCOUNT_MENU_ITEMS[0]?.label ?? "" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("account-name")).not.toBeInTheDocument();
    expect(avatar()).toHaveFocus();
  });

  it("opens with Enter and closes on a press outside", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <AccountMenu />
        <p>dehors</p>
      </div>,
    );
    avatar().focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("account-name")).toBeInTheDocument();
    await user.click(screen.getByText("dehors"));
    expect(screen.queryByTestId("account-name")).not.toBeInTheDocument();
  });

  it("signing out clears the client state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);
    await user.click(avatar());
    const form = screen.getByRole("button", { name: "Se déconnecter" }).closest("form");
    expect(form).not.toBeNull();
    if (form !== null) {
      fireEvent.submit(form);
    }
    expect(clientState.reset).toHaveBeenCalledTimes(1);
    expect(clientState.clearGuestCart).toHaveBeenCalledTimes(1);
  });
});

describe("AccountMenu visitor", () => {
  it("keeps the sign-up and sign-in links", () => {
    session.value = { data: null, status: "unauthenticated" };
    renderWithProviders(<AccountMenu />);
    expect(screen.getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: AVATAR_NAME })).not.toBeInTheDocument();
  });
});
