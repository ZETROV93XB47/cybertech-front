import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import {
  CategoryTiles,
  type CategoryTilesProps,
} from "@/features/catalog/components/CategoryTiles";
import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { CategoryKey } from "@/lib/enums/category-key";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";

import { installMatchMedia } from "../../helpers/match-media";

/**
 * Renders the tiles inside the preferences their tilt effect reads.
 *
 * @param counts - Counts by category.
 * @returns The render result.
 */
function renderTiles(counts: CategoryTilesProps["counts"]): ReturnType<typeof render> {
  installMatchMedia();
  return render(
    <PreferencesProvider initialPreferences={DEFAULT_PREFERENCES}>
      <CategoryTiles counts={counts} />
    </PreferencesProvider>,
  );
}

describe("CategoryTiles", () => {
  it("links each category to the filtered catalog with its real count", async () => {
    const { container } = renderTiles({ [CategoryKey.COMPUTER]: 531, [CategoryKey.MONITOR]: 0 });
    const computers = screen.getByRole("link", { name: /Ordinateurs/ });
    expect(computers).toHaveAttribute("href", "/products?category=COMPUTER");
    expect(computers).toHaveTextContent("531 produits");
    const monitors = screen.getByRole("link", { name: /Écrans/ });
    expect(monitors).toHaveAttribute("href", "/products?category=MONITOR");
    expect(monitors).toHaveTextContent("Aucun produit pour l'instant");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows no count when it is unknown", () => {
    renderTiles({ [CategoryKey.COMPUTER]: null, [CategoryKey.MONITOR]: 1 });
    expect(screen.getByRole("link", { name: /Ordinateurs/ })).not.toHaveTextContent(/produit/);
    expect(screen.getByRole("link", { name: /Écrans/ })).toHaveTextContent("1 produit");
  });
});
