/**
 * Feature 004 US1 (T013): the category tag shown on cards, the product page, cart, order and
 * wishlist lines.
 *
 * @see specs/004-catalog-promos-reviews/spec.md FR-003
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { CategoryTag } from "@/features/catalog/components/CategoryTag";

describe("CategoryTag", () => {
  it.each([
    ["SMARTWATCH", "Montres connectées", "lucide-watch"],
    ["DESKTOP", "Ordinateurs de bureau", "lucide-pc-case"],
    ["TABLET", "Autres produits", "lucide-package"],
    [null, "Autres produits", "lucide-package"],
  ])("shows %s as « %s » with its icon", async (category, label, iconClass) => {
    const { container } = render(<CategoryTag category={category} />);
    expect(screen.getByTestId("category-tag")).toHaveTextContent(label);
    const icon = container.querySelector("svg");
    expect(icon).toHaveClass(iconClass);
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
});
