import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainNav } from "@/components/layout/MainNav";
import { ActiveFilters } from "@/features/catalog/components/ActiveFilters";
import { CompareBar } from "@/features/compare/components/CompareBar";
import { CompareToggle } from "@/features/compare/components/CompareToggle";
import { COMPARE_CHANGED_EVENT } from "@/features/compare/selection";
import { CategoryKey } from "@/lib/enums/category-key";
import { CompareToggleVariant } from "@/lib/enums/compare-toggle-variant";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { StorageKey } from "@/lib/enums/storage-key";
import { EffectsLevel } from "@/lib/enums/theme";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import { fakeUuids } from "../../helpers/products";
import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";
import { server } from "../../msw/server";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/features/cart/components/AddToCartButton", () => ({
  AddToCartButton: (): ReactNode => <button type="button">Ajouter au panier</button>,
}));
vi.mock("@/features/catalog/components/AvailabilityBadge", () => ({
  AvailabilityBadge: (): ReactNode => <span>En stock</span>,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams("category=COMPUTER"),
}));

const [A = "", B = ""] = fakeUuids(2);

/** Every effects situation, with the entrance it must give. */
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

/**
 * Stores a two-product selection, as a previous page would have.
 */
function selectTwo(): void {
  act(() => {
    window.sessionStorage.setItem(
      StorageKey.COMPARE,
      JSON.stringify({ category: CategoryKey.COMPUTER, uuids: [A, B] }),
    );
    window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
  });
}

/** Serves the cards and the comparison view of the selection. */
function serveSelection(): void {
  const card = (uuid: string): Record<string, unknown> => ({
    uuid,
    name: `PC ${uuid.slice(-1)}`,
    brand: "LENOVO",
    category: "COMPUTER",
    price: 999,
    imageUrl: null,
  });
  server.use(
    http.get("*/api/products", () => HttpResponse.json({ products: [card(A), card(B)] })),
    http.get("*/api/compare", () =>
      HttpResponse.json({
        category: CategoryKey.COMPUTER,
        products: [card(A), card(B)],
        rows: [],
        missing: [],
      }),
    ),
  );
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe.each(LEVELS)("effects %s", (_label, options, expected) => {
  it(`the comparison bar enters in ${expected} mode`, async () => {
    serveSelection();
    renderWithProviders(<CompareBar />, options);
    selectTwo();
    const bar = await screen.findByRole("region", { name: "Comparaison" });
    expect(bar).toHaveAttribute("data-entrance", expected);
    if (expected === EntranceMode.FADE) {
      expect(bar.style.transform).not.toMatch(/translate/);
    }
  });

  it(`the comparison modal opens in ${expected} mode`, async () => {
    serveSelection();
    const user = userEvent.setup();
    renderWithProviders(<CompareBar />, options);
    selectTwo();
    await user.click(await screen.findByRole("button", { name: /^Comparer/ }));
    expect(await screen.findByRole("dialog")).toHaveAttribute("data-entrance", expected);
  });

  it(`the navigation underline moves in ${expected} mode`, () => {
    renderWithProviders(<MainNav categories={[CategoryKey.COMPUTER]} counts={{}} />, options);
    const current = screen.getByRole("button", { name: "Catalogue" });
    expect(current.querySelector("[data-nav-indicator]")).toHaveAttribute(
      "data-entrance",
      expected,
    );
  });

  it(`the compare check mark appears in ${expected} mode`, async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CompareToggle
        productUuid={A}
        productName="PC A"
        category={CategoryKey.COMPUTER}
        variant={CompareToggleVariant.CHECKBOX}
      />,
      options,
    );
    await user.click(screen.getByRole("checkbox"));
    const label = screen.getByText("Comparer").closest("label");
    expect(label?.querySelector("[data-entrance]")).toHaveAttribute("data-entrance", expected);
  });

  it("the active-filter pills only fade, whatever the level", () => {
    renderWithProviders(
      <ActiveFilters filters={{ ...EMPTY_SEARCH_FILTERS, keyword: "dell" }} facets={[]} />,
      options,
    );
    const pills = within(screen.getByRole("navigation", { name: "Filtres actifs" })).getAllByRole(
      "listitem",
    );
    for (const pill of pills) {
      expect(pill).toHaveClass("enter-fade");
      expect(pill).not.toHaveClass("enter-rise");
    }
  });
});
