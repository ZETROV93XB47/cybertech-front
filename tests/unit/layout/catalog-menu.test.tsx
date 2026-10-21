/**
 * Feature 004, US2 (T022) — « Catalogue » menu of the header: trigger state, panel content, keyboard
 * use, current category and opening animation per effects level.
 */
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainNav, type MainNavProps } from "@/components/layout/MainNav";
import { NavSectionMarker } from "@/components/layout/NavSectionMarker";
import { publishNavCategory } from "@/components/layout/nav-section";
import { CategoryKey } from "@/lib/enums/category-key";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { EffectsLevel } from "@/lib/enums/theme";

import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";

/** Every active category, with a count for each but the watches (unknown). */
const NAV_PROPS: MainNavProps = {
  categories: [
    CategoryKey.COMPUTER,
    CategoryKey.DESKTOP,
    CategoryKey.MONITOR,
    CategoryKey.SMARTPHONE,
    CategoryKey.SMARTWATCH,
  ],
  counts: {
    [CategoryKey.COMPUTER]: 616,
    [CategoryKey.DESKTOP]: 1,
    [CategoryKey.MONITOR]: 42,
    [CategoryKey.SMARTPHONE]: 1_250,
    [CategoryKey.SMARTWATCH]: null,
  },
};

const location = vi.hoisted(() => ({ pathname: "/", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

afterEach(() => {
  act(() => {
    publishNavCategory(null);
  });
});

/**
 * Renders the navigation at an address.
 *
 * @param pathname - Current path.
 * @param search - Current query string.
 * @param options - Effects level and system setting.
 * @returns The render result.
 */
function renderAt(
  pathname: string,
  search = "",
  options: ProviderOptions = {},
): ReturnType<typeof renderWithProviders> {
  location.pathname = pathname;
  location.search = search;
  return renderWithProviders(<MainNav {...NAV_PROPS} />, options);
}

/** The « Catalogue » trigger. */
function trigger(): HTMLElement {
  return screen.getByRole("button", { name: "Catalogue" });
}

/**
 * Opens the menu with a click.
 *
 * @returns The link list of the panel.
 */
async function openMenu(): Promise<HTMLElement> {
  await userEvent.setup().click(trigger());
  return screen.findByRole("list", { name: "Catégories du catalogue" });
}

describe("CatalogMenu", () => {
  it("is closed at first, with aria-expanded on the trigger", () => {
    renderAt("/");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /Smartphones/ })).not.toBeInTheDocument();
  });

  it("opens on click with « Tout le catalogue » then the categories in order", async () => {
    const { container } = renderAt("/");
    const list = await openMenu();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Tout le catalogue",
      "Ordinateurs portables616 produits",
      "Ordinateurs de bureau1 produit",
      "Écrans42 produits",
      `Smartphones${(1_250).toLocaleString("fr-FR")} produits`,
      "Montres connectées",
    ]);
    expect(links[0]).toHaveAttribute("href", "/products");
    expect(links[5]).toHaveAttribute("href", "/products?category=SMARTWATCH");
    expect(links.every((link) => link.querySelector("svg") !== null)).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("closes on Escape and gives the focus back to the trigger", async () => {
    renderAt("/");
    await openMenu();
    await userEvent.setup().keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("reaches every link with Tab after opening with Enter", async () => {
    const user = userEvent.setup();
    renderAt("/");
    trigger().focus();
    await user.keyboard("{Enter}");
    const list = await screen.findByRole("list", { name: "Catégories du catalogue" });
    const linkCount = within(list).getAllByRole("link").length;
    const reached: string[] = [];
    while (reached.length < linkCount) {
      await user.tab();
      reached.push(document.activeElement?.getAttribute("href") ?? "");
    }
    expect(reached).toEqual([
      "/products",
      "/products?category=COMPUTER",
      "/products?category=DESKTOP",
      "/products?category=MONITOR",
      "/products?category=SMARTPHONE",
      "/products?category=SMARTWATCH",
    ]);
  });

  it("marks the category of the filtered catalog", async () => {
    renderAt("/products", "category=SMARTWATCH");
    const list = await openMenu();
    const current = within(list).getAllByRole("link", { current: "page" });
    expect(current.map((link) => link.textContent)).toEqual(["Montres connectées"]);
    expect(trigger()).toHaveAttribute("aria-current", "page");
  });

  it("marks « Tout le catalogue » on the unfiltered catalog", async () => {
    renderAt("/products");
    const list = await openMenu();
    const current = within(list).getAllByRole("link", { current: "page" });
    expect(current.map((link) => link.textContent)).toEqual(["Tout le catalogue"]);
  });

  it("marks the category of the product page shown", async () => {
    location.pathname = "/products/0193a2b4-1111-7222-8333-000000000001";
    location.search = "";
    renderWithProviders(
      <>
        <MainNav {...NAV_PROPS} />
        <NavSectionMarker category={CategoryKey.SMARTPHONE} />
      </>,
    );
    const list = await openMenu();
    const current = within(list).getAllByRole("link", { current: "page" });
    expect(current[0]).toHaveAccessibleName(/Smartphones/);
  });

  it("closes on a second click of the trigger", async () => {
    renderAt("/");
    await openMenu();
    await userEvent.setup().click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when the trigger is clicked right after a hover opening", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.hover(trigger());
    await screen.findByRole("list", { name: "Catégories du catalogue" });
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    ["FULL", { effects: EffectsLevel.FULL }, EntranceMode.MOVE],
    ["REDUCED", { effects: EffectsLevel.REDUCED }, EntranceMode.FADE],
    ["OFF", { effects: EffectsLevel.OFF }, EntranceMode.FADE],
    ["FULL with system reduced motion", { reducedMotion: true }, EntranceMode.FADE],
  ] as const)("%s: the panel opens in %s mode", async (_label, options, expected) => {
    renderAt("/", "", options);
    const list = await openMenu();
    const panel = list.closest("[data-entrance]");
    expect(panel).toHaveAttribute("data-entrance", expected);
    if (expected === EntranceMode.FADE) {
      expect((panel as HTMLElement).style.transform).not.toMatch(/translate|scale/);
    }
  });
});
