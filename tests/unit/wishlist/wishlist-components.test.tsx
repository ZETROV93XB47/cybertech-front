/**
 * Wishlist components with jest-axe (feature 003 US6, T091): the heart and « Ma wishlist ».
 *
 * @see specs/003-account-orders/spec.md US6, FR-035, FR-037, FR-038
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WishlistButton } from "@/features/wishlist/components/WishlistButton";
import { WishlistList } from "@/features/wishlist/components/WishlistList";
import { WISHLIST_MESSAGES } from "@/features/wishlist/messages";
import { wishlistQueryKey } from "@/features/wishlist/hooks/useWishlist";
import type { WishlistRow } from "@/features/wishlist/wishlist-view";
import { takeWishlistPending } from "@/features/wishlist/wishlist-pending";
import { loginPath } from "@/lib/auth/callback-url";
import { ACCOUNT_PATHS, CATALOG_PATH, productPath } from "@/lib/constants/routes";
import { WishlistButtonVariant } from "@/lib/enums/wishlist-button-variant";

import { PRODUCT_A, PRODUCT_B } from "../../helpers/cart";
import { renderWithProviders } from "../../helpers/providers";
import { server } from "../../msw/server";

interface FakeSession {
  data: { user: { name: string } } | null;
  status: string;
}

const session = vi.hoisted((): { value: FakeSession } => ({
  value: { data: null, status: "unauthenticated" },
}));
const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next-auth/react", () => ({ useSession: () => session.value }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/products",
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const NAME = "Surface Go 4";

/**
 * Builds a wishlist row.
 *
 * @param productUuid - Product.
 * @param name - Product name.
 * @returns The row.
 */
function row(productUuid: string, name: string): WishlistRow {
  return {
    productUuid,
    name,
    category: "COMPUTER",
    price: 729,
    imageUrl: null,
    href: productPath(productUuid),
    addedOn: "14 octobre",
  };
}

/**
 * Answers the live stock of the given products.
 *
 * @param stock - Available units per product.
 */
function mockStock(stock: Record<string, number>): void {
  server.use(
    http.get("*/api/availability", () =>
      HttpResponse.json({
        items: Object.entries(stock).map(([productUuid, availableStock]) => ({
          productUuid,
          availableStock,
          inStock: availableStock > 0,
        })),
      }),
    ),
  );
}

beforeEach(() => {
  session.value = { data: null, status: "unauthenticated" };
  navigation.push.mockReset();
  navigation.refresh.mockReset();
  window.sessionStorage.clear();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("WishlistButton", () => {
  it("names the action and reflects the state for a signed-in user", async () => {
    session.value = { data: { user: { name: "Ada" } }, status: "authenticated" };
    server.use(
      http.get("*/api/wishlist/ids", () => HttpResponse.json({ productUuids: [PRODUCT_A] })),
    );
    const { container } = renderWithProviders(
      <WishlistButton
        productUuid={PRODUCT_A}
        productName={NAME}
        variant={WishlistButtonVariant.CARD}
      />,
    );
    const button = await screen.findByRole("button", { name: WISHLIST_MESSAGES.remove(NAME) });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("adds on click and confirms", async () => {
    session.value = { data: { user: { name: "Ada" } }, status: "authenticated" };
    server.use(
      http.get("*/api/wishlist/ids", () => HttpResponse.json({ productUuids: [] })),
      http.put(`*/api/wishlist/${PRODUCT_A}`, () =>
        HttpResponse.json({ productUuid: PRODUCT_A, isInWishlist: true }),
      ),
    );
    const { queryClient } = renderWithProviders(
      <WishlistButton
        productUuid={PRODUCT_A}
        productName={NAME}
        variant={WishlistButtonVariant.DETAIL}
      />,
    );
    await waitFor(() => {
      expect(queryClient.getQueryData(wishlistQueryKey())).toEqual([]);
    });
    await userEvent.click(screen.getByRole("button", { name: WISHLIST_MESSAGES.detailAdd }));
    expect(
      await screen.findByRole("button", { name: WISHLIST_MESSAGES.detailRemove }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(toast.success).toHaveBeenCalledWith(WISHLIST_MESSAGES.added(NAME));
  });

  it("goes back to the previous state with a message when refused", async () => {
    session.value = { data: { user: { name: "Ada" } }, status: "authenticated" };
    server.use(
      http.get("*/api/wishlist/ids", () => HttpResponse.json({ productUuids: [] })),
      http.put(`*/api/wishlist/${PRODUCT_A}`, () =>
        HttpResponse.json({ error: { code: "unavailable", message: "down" } }, { status: 503 }),
      ),
    );
    renderWithProviders(
      <WishlistButton
        productUuid={PRODUCT_A}
        productName={NAME}
        variant={WishlistButtonVariant.CARD}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: WISHLIST_MESSAGES.add(NAME) }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(WISHLIST_MESSAGES.unavailable);
    });
    expect(screen.getByRole("button", { name: WISHLIST_MESSAGES.add(NAME) })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the add aside and opens the sign-in page for a visitor", async () => {
    renderWithProviders(
      <WishlistButton
        productUuid={PRODUCT_A}
        productName={NAME}
        variant={WishlistButtonVariant.CARD}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: WISHLIST_MESSAGES.add(NAME) }));
    expect(navigation.push).toHaveBeenCalledWith(loginPath("/products"));
    expect(takeWishlistPending(window.sessionStorage)).toEqual({ productUuid: PRODUCT_A });
  });
});

describe("WishlistList", () => {
  beforeEach(() => {
    session.value = { data: { user: { name: "Ada" } }, status: "authenticated" };
    server.use(http.get("*/api/cart", () => HttpResponse.json({ status: 404 }, { status: 404 })));
  });

  it("lists the products with their day, accessible", async () => {
    mockStock({ [PRODUCT_A]: 3, [PRODUCT_B]: 2 });
    const { container } = renderWithProviders(
      <WishlistList
        rows={[row(PRODUCT_A, NAME), row(PRODUCT_B, "Dell XPS")]}
        page={1}
        totalPages={1}
      />,
    );
    const list = screen.getByRole("list", { name: WISHLIST_MESSAGES.listLabel });
    expect(list.querySelectorAll(":scope > li")).toHaveLength(2);
    expect(screen.getAllByText(WISHLIST_MESSAGES.addedOn("14 octobre"))).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("disables the add to cart of an out-of-stock product", async () => {
    mockStock({ [PRODUCT_A]: 0 });
    renderWithProviders(<WishlistList rows={[row(PRODUCT_A, NAME)]} page={1} totalPages={1} />);
    await waitFor(() => {
      expect(
        screen.getAllByRole("button").find((button) => button.hasAttribute("disabled")),
      ).toBeDefined();
    });
  });

  it("removes a row at once, then refreshes the server list", async () => {
    mockStock({ [PRODUCT_A]: 3, [PRODUCT_B]: 3 });
    server.use(
      http.delete(`*/api/wishlist/${PRODUCT_A}`, () =>
        HttpResponse.json({ productUuid: PRODUCT_A, isInWishlist: false }),
      ),
    );
    renderWithProviders(
      <WishlistList
        rows={[row(PRODUCT_A, NAME), row(PRODUCT_B, "Dell XPS")]}
        page={1}
        totalPages={1}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: WISHLIST_MESSAGES.removeLabel(NAME) }),
    );
    await waitFor(() => {
      expect(navigation.refresh).toHaveBeenCalled();
    });
    expect(screen.queryByText(NAME)).toBeNull();
  });

  it("shows the empty state with a way to the catalog", async () => {
    const { container } = renderWithProviders(<WishlistList rows={[]} page={1} totalPages={0} />);
    expect(screen.getByRole("heading", { name: WISHLIST_MESSAGES.emptyTitle })).toBeVisible();
    expect(screen.getByRole("link", { name: WISHLIST_MESSAGES.goToCatalog })).toHaveAttribute(
      "href",
      CATALOG_PATH,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("links to the previous and next pages", () => {
    mockStock({ [PRODUCT_A]: 3 });
    renderWithProviders(<WishlistList rows={[row(PRODUCT_A, NAME)]} page={2} totalPages={3} />);
    expect(screen.getByRole("link", { name: WISHLIST_MESSAGES.previousPage })).toHaveAttribute(
      "href",
      ACCOUNT_PATHS.wishlist,
    );
    expect(screen.getByRole("link", { name: WISHLIST_MESSAGES.nextPage })).toHaveAttribute(
      "href",
      `${ACCOUNT_PATHS.wishlist}?page=3`,
    );
    expect(screen.getByText(WISHLIST_MESSAGES.pageStatus(2, 3))).toBeVisible();
  });
});
