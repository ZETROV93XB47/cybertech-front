import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompareBar } from "@/features/compare/components/CompareBar";
import { CompareTable } from "@/features/compare/components/CompareTable";
import { CompareToggle } from "@/features/compare/components/CompareToggle";
import { COMPARE_CHANGED_EVENT } from "@/features/compare/selection";
import { CategoryKey } from "@/lib/enums/category-key";
import { CompareToggleVariant } from "@/lib/enums/compare-toggle-variant";
import { StorageKey } from "@/lib/enums/storage-key";
import type { ComparisonView } from "@/lib/schemas/compare";

import { fakeUuids } from "../../helpers/products";
import { renderWithProviders } from "../../helpers/providers";
import { server } from "../../msw/server";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/features/cart/components/AddToCartButton", () => ({
  AddToCartButton: ({ productName }: { productName: string }): ReactNode => (
    <button type="button">{`Ajouter ${productName} au panier`}</button>
  ),
}));
vi.mock("@/features/catalog/components/AvailabilityBadge", () => ({
  AvailabilityBadge: (): ReactNode => <span>En stock</span>,
}));

const [A = "", B = "", C = "", D = ""] = fakeUuids(4);

const NAMES: Readonly<Record<string, string>> = { [A]: "PC A", [B]: "PC B", [C]: "PC C" };

/**
 * Builds a product card as returned by the BFF.
 *
 * @param uuid - Product UUID.
 * @returns The card.
 */
function card(uuid: string): Record<string, unknown> {
  return {
    uuid,
    name: NAMES[uuid] ?? "PC",
    brand: "LENOVO",
    category: "COMPUTER",
    price: 999,
    imageUrl: null,
  };
}

/**
 * Stores a selection, as a previous page would have.
 *
 * @param uuids - Selected products.
 * @param category - Their category.
 */
function select(uuids: readonly string[], category = CategoryKey.COMPUTER): void {
  act(() => {
    window.sessionStorage.setItem(StorageKey.COMPARE, JSON.stringify({ category, uuids }));
    window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
  });
}

/** Reads the stored selection UUIDs. */
function storedUuids(): string[] {
  const raw = window.sessionStorage.getItem(StorageKey.COMPARE);
  return raw ? (JSON.parse(raw) as { uuids: string[] }).uuids : [];
}

/**
 * Serves `/api/products` with the given known products.
 *
 * @param known - UUIDs the catalog still has.
 */
function serveCards(known: readonly string[]): void {
  server.use(
    http.get("*/api/products", ({ request }) => {
      const asked = new URL(request.url).searchParams.get("uuids")?.split(",") ?? [];
      return HttpResponse.json({
        products: asked.filter((uuid) => known.includes(uuid)).map(card),
      });
    }),
  );
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.mocked(toast).mockClear();
});

describe("CompareToggle", () => {
  it("adds and removes the product with a checkbox named after it", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <CompareToggle
        productUuid={A}
        productName="PC A"
        category={CategoryKey.COMPUTER}
        variant={CompareToggleVariant.CHECKBOX}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: /Comparer PC A/ });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(storedUuids()).toEqual([A]);
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(storedUuids()).toEqual([]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is aria-disabled with the reason when the comparison is full", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CompareToggle
        productUuid={D}
        productName="PC D"
        category={CategoryKey.COMPUTER}
        variant={CompareToggleVariant.CHECKBOX}
      />,
    );
    select([A, B, C]);
    const checkbox = screen.getByRole("checkbox", { name: /Comparer PC D/ });
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    expect(checkbox).toHaveAccessibleDescription(/3 produits maximum/);
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(storedUuids()).toEqual([A, B, C]);
    expect(screen.getByRole("status")).toHaveTextContent(/3 produits maximum/);
  });

  it("explains why a product of another category cannot be added", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <CompareToggle
        productUuid={B}
        productName="Écran B"
        category={CategoryKey.MONITOR}
        variant={CompareToggleVariant.BUTTON}
      />,
    );
    select([A]);
    const button = screen.getByRole("button", { name: "Ajouter à la comparaison" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(/même catégorie/);
    await user.click(button);
    expect(storedUuids()).toEqual([A]);
    expect(screen.getByRole("status")).toHaveTextContent(/même catégorie/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("toggles the product page button label", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CompareToggle
        productUuid={A}
        productName="PC A"
        category={CategoryKey.COMPUTER}
        variant={CompareToggleVariant.BUTTON}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ajouter à la comparaison" }));
    expect(storedUuids()).toEqual([A]);
    await user.click(screen.getByRole("button", { name: "Retirer de la comparaison" }));
    expect(storedUuids()).toEqual([]);
  });
});

describe("CompareBar", () => {
  it("renders nothing visible when the selection is empty", () => {
    renderWithProviders(<CompareBar />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("invites to pick another product with one product, offers « Comparer » from two", async () => {
    serveCards([A, B]);
    const { container } = renderWithProviders(<CompareBar />);
    select([A]);
    const bar = await screen.findByRole("region", { name: "Comparaison" });
    expect(within(bar).getByText("Choisis un autre produit à comparer.")).toBeInTheDocument();
    expect(within(bar).queryByRole("button", { name: /^Comparer/ })).not.toBeInTheDocument();
    select([A, B]);
    expect(await within(bar).findByRole("button", { name: /^Comparer/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 produits à comparer");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("removes one product and clears everything", async () => {
    serveCards([A, B]);
    const user = userEvent.setup();
    renderWithProviders(<CompareBar />);
    select([A, B]);
    await user.click(await screen.findByRole("button", { name: "Retirer PC A de la comparaison" }));
    expect(storedUuids()).toEqual([B]);
    await user.click(screen.getByRole("button", { name: "Tout effacer" }));
    expect(storedUuids()).toEqual([]);
    await waitFor(() => expect(screen.queryByRole("region")).not.toBeInTheDocument());
  });

  it("drops a product the catalog no longer has, with one toast, without opening the modal", async () => {
    serveCards([A]);
    renderWithProviders(<CompareBar />);
    select([A, B]);
    await waitFor(() => {
      expect(storedUuids()).toEqual([A]);
    });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      "Un produit de ta comparaison n'est plus disponible, on l'a retiré.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the comparison and gives the focus back to « Comparer » on Escape", async () => {
    serveCards([A, B]);
    server.use(
      http.get("*/api/compare", () =>
        HttpResponse.json({
          category: CategoryKey.COMPUTER,
          products: [card(A), card(B)],
          rows: [{ key: "cpu", label: "Processeur", values: ["X", "Y"], differs: true }],
          missing: [],
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CompareBar />);
    select([A, B]);
    const open = await screen.findByRole("button", { name: /^Comparer/ });
    await user.click(open);
    const dialog = await screen.findByRole("dialog", { name: "Comparer les produits" });
    expect(await within(dialog).findByRole("rowheader", { name: /Processeur/ })).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(open).toHaveFocus();
  });
});

const VIEW: ComparisonView = {
  category: CategoryKey.COMPUTER,
  products: [card(A), card(B)] as ComparisonView["products"],
  rows: [
    { key: "cpu", label: "Processeur", values: ["AMD Ryzen 7", "AMD Ryzen 7"], differs: false },
    { key: "ram", label: "Mémoire vive", values: ["16 Go", null], differs: true },
  ],
  missing: [],
};

describe("CompareTable", () => {
  it("uses column headers for products and row headers for characteristics", async () => {
    const { container } = renderWithProviders(<CompareTable view={VIEW} differencesOnly={false} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: /PC A/ })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /Processeur/ })).toBeInTheDocument();
    const ram = screen.getByRole("row", { name: /Mémoire vive/ });
    expect(within(ram).getByText("—")).toBeInTheDocument();
    expect(within(ram).getByText("valeurs différentes")).toHaveClass("sr-only");
    expect(
      within(screen.getByRole("row", { name: /Processeur/ })).queryByText("valeurs différentes"),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps only the differing rows when asked", () => {
    renderWithProviders(<CompareTable view={VIEW} differencesOnly />);
    expect(screen.queryByRole("rowheader", { name: /Processeur/ })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /Mémoire vive/ })).toBeInTheDocument();
  });

  it("says so when no row differs", () => {
    const same: ComparisonView = { ...VIEW, rows: VIEW.rows.slice(0, 1) };
    renderWithProviders(<CompareTable view={same} differencesOnly />);
    expect(screen.getByText("Aucune différence entre ces produits.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
