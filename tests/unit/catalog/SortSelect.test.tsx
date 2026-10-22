/**
 * « Trier par » selector: labelled listbox with every order, the current one checked, navigation
 * to the first page with the filters kept, the opening per effects level, and a no-JavaScript
 * form.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SortSelect } from "@/features/catalog/components/SortSelect";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { ProductSort } from "@/lib/enums/product-sort";
import { EffectsLevel } from "@/lib/enums/theme";
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/lib/schemas/search";

import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

/** Smartphones of one brand, third page, cheapest first. */
const FILTERS: SearchFilters = {
  ...EMPTY_SEARCH_FILTERS,
  category: CategoryKey.SMARTPHONE,
  brands: [Brand.APPLE],
  sort: ProductSort.PRICE_ASC,
  page: 2,
};

/** Every effects situation, with the opening it must give. */
const LEVELS: readonly (readonly [string, ProviderOptions, EntranceMode])[] = [
  ["FULL", { effects: EffectsLevel.FULL }, EntranceMode.MOVE],
  ["REDUCED", { effects: EffectsLevel.REDUCED }, EntranceMode.FADE],
  ["OFF", { effects: EffectsLevel.OFF }, EntranceMode.FADE],
  [
    "FULL with system reduced motion",
    { effects: EffectsLevel.FULL, reducedMotion: true },
    EntranceMode.FADE,
  ],
];

// The Radix listbox uses pointer capture and scrolls the checked option into view: jsdom has
// neither.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

/**
 * Renders the selector and opens its list.
 *
 * @param filters - Current filters.
 * @param options - Effects level and system setting.
 * @returns The open listbox.
 */
async function openList(
  filters: SearchFilters,
  options: ProviderOptions = {},
): Promise<HTMLElement> {
  renderWithProviders(<SortSelect filters={filters} />, options);
  await userEvent.setup().click(screen.getByRole("combobox", { name: "Trier par" }));
  return screen.findByRole("listbox");
}

describe("SortSelect", () => {
  it("shows the current order next to the label", async () => {
    const { container } = renderWithProviders(<SortSelect filters={FILTERS} />);
    const trigger = screen.getByRole("combobox", { name: "Trier par" });
    expect(trigger).toHaveTextContent("Prix croissant");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the relevance when no order is chosen", () => {
    renderWithProviders(<SortSelect filters={EMPTY_SEARCH_FILTERS} />);
    expect(screen.getByRole("combobox", { name: "Trier par" })).toHaveTextContent("Pertinence");
  });

  it("lists every order and checks the current one", async () => {
    const list = await openList(FILTERS);
    const options = within(list).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Pertinence",
      "Nom, de A à Z",
      "Prix croissant",
      "Prix décroissant",
      "Mieux notés",
    ]);
    expect(within(list).getByRole("option", { name: "Prix croissant" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("goes back to the first page with the new order, keeping the filters", async () => {
    const list = await openList(FILTERS);
    await userEvent.setup().click(within(list).getByRole("option", { name: "Mieux notés" }));
    expect(router.push).toHaveBeenLastCalledWith(
      "/products?category=SMARTPHONE&brand=APPLE&sort=rating-desc",
    );
  });

  it("drops the order from the URL when the relevance is chosen", async () => {
    const list = await openList(FILTERS);
    await userEvent.setup().click(within(list).getByRole("option", { name: "Pertinence" }));
    expect(router.push).toHaveBeenLastCalledWith("/products?category=SMARTPHONE&brand=APPLE");
  });

  it("closes on Escape and gives the focus back to the trigger", async () => {
    await openList(FILTERS);
    await userEvent.setup().keyboard("{Escape}");
    const trigger = screen.getByRole("combobox", { name: "Trier par" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("carries the filters, not the page nor the order, as hidden fields", () => {
    const { container } = renderWithProviders(<SortSelect filters={FILTERS} />);
    const hidden = [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
    expect(hidden.map((input) => [input.name, input.value])).toEqual([
      ["category", "SMARTPHONE"],
      ["brand", "APPLE"],
    ]);
  });

  it.each(LEVELS)("opens in the right mode at effects %s", async (_label, options, expected) => {
    const list = await openList(FILTERS, options);
    expect(list.querySelector("[data-entrance]")).toHaveAttribute("data-entrance", expected);
  });
});
