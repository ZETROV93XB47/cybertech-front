import { act, render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainNav, StaticMainNav } from "@/components/layout/MainNav";
import { NavSectionMarker } from "@/components/layout/NavSectionMarker";
import { publishNavCategory } from "@/components/layout/nav-section";
import { CategoryKey } from "@/lib/enums/category-key";

const location = vi.hoisted(() => ({ pathname: "/", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

/**
 * Renders the navigation at an address.
 *
 * @param pathname - Current path.
 * @param search - Current query string.
 * @returns The render result.
 */
function renderAt(pathname: string, search = ""): ReturnType<typeof render> {
  location.pathname = pathname;
  location.search = search;
  return render(<MainNav />);
}

/** Links of the main navigation, in order. */
function navLinks(): HTMLElement[] {
  return within(screen.getByRole("navigation", { name: "Navigation principale" })).getAllByRole(
    "link",
  );
}

afterEach(() => {
  act(() => {
    publishNavCategory(null);
  });
});

describe("MainNav", () => {
  it("lists Accueil, Catalogue, Ordinateurs and Écrans with their addresses", async () => {
    const { container } = renderAt("/");
    expect(navLinks().map((link) => link.textContent)).toEqual([
      "Accueil",
      "Catalogue",
      "Ordinateurs",
      "Écrans",
    ]);
    expect(navLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/products",
      "/products?category=COMPUTER",
      "/products?category=MONITOR",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ["/", "", "Accueil"],
    ["/products", "", "Catalogue"],
    ["/products", "category=COMPUTER&page=2", "Ordinateurs"],
    ["/products", "category=MONITOR", "Écrans"],
  ])("marks exactly one current link on %s?%s", (pathname, search, current) => {
    renderAt(pathname, search);
    const currentLinks = navLinks().filter((link) => link.getAttribute("aria-current") === "page");
    expect(currentLinks.map((link) => link.textContent)).toEqual([current]);
    expect(currentLinks[0]?.querySelector("[data-nav-indicator]")).not.toBeNull();
  });

  it("marks no link on the cart page", () => {
    renderAt("/cart");
    expect(navLinks().filter((link) => link.hasAttribute("aria-current"))).toHaveLength(0);
    expect(document.querySelector("[data-nav-indicator]")).toBeNull();
  });

  it("follows the category published by a product page", () => {
    location.pathname = "/products/0193a2b4-1111-7222-8333-000000000001";
    location.search = "";
    const { unmount } = render(
      <>
        <MainNav />
        <NavSectionMarker category={CategoryKey.COMPUTER} />
      </>,
    );
    expect(screen.getByRole("link", { name: "Ordinateurs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    unmount();
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Catalogue" })).toHaveAttribute("aria-current", "page");
  });

  it("has a static version without current link", () => {
    render(<StaticMainNav />);
    expect(navLinks()).toHaveLength(4);
    expect(navLinks().filter((link) => link.hasAttribute("aria-current"))).toHaveLength(0);
  });
});
