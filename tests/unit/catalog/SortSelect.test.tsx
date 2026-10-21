/**
 * « Trier par » selector: labelled select with every order, the current one selected, navigation
 * to the first page with the filters kept, and a no-JavaScript form.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { SortSelect } from "@/features/catalog/components/SortSelect";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { ProductSort } from "@/lib/enums/product-sort";
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/lib/schemas/search";

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

describe("SortSelect", () => {
  it("lists every order and selects the current one", async () => {
    const { container } = render(<SortSelect filters={FILTERS} />);
    const select = screen.getByRole("combobox", { name: "Trier par" });
    expect(select).toHaveValue(ProductSort.PRICE_ASC);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Pertinence",
      "Nom, de A à Z",
      "Prix croissant",
      "Prix décroissant",
      "Mieux notés",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the relevance when no order is chosen", () => {
    render(<SortSelect filters={EMPTY_SEARCH_FILTERS} />);
    expect(screen.getByRole("combobox", { name: "Trier par" })).toHaveValue(ProductSort.RELEVANCE);
  });

  it("goes back to the first page with the new order, keeping the filters", async () => {
    render(<SortSelect filters={FILTERS} />);
    await userEvent.setup().selectOptions(screen.getByRole("combobox"), ProductSort.RATING_DESC);
    expect(router.push).toHaveBeenLastCalledWith(
      "/products?category=SMARTPHONE&brand=APPLE&sort=rating-desc",
    );
  });

  it("drops the order from the URL when the relevance is chosen", async () => {
    render(<SortSelect filters={FILTERS} />);
    await userEvent.setup().selectOptions(screen.getByRole("combobox"), ProductSort.RELEVANCE);
    expect(router.push).toHaveBeenLastCalledWith("/products?category=SMARTPHONE&brand=APPLE");
  });

  it("carries the filters, not the page nor the order, as hidden fields", () => {
    const { container } = render(<SortSelect filters={FILTERS} />);
    const hidden = [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
    expect(hidden.map((input) => [input.name, input.value])).toEqual([
      ["category", "SMARTPHONE"],
      ["brand", "APPLE"],
    ]);
  });
});
