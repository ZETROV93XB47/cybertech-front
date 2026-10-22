/**
 * Site dropdown rule: every dropdown row is the « Catalogue » menu row; the current page or the
 * chosen option only gets the gold bar (no background pill), so a menu looks the same whatever
 * the page; the icon is optional.
 */
import { render, screen } from "@testing-library/react";
import { Laptop } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  DROPDOWN_ROW_CLASS,
  DROPDOWN_ROW_CURRENT_CLASS,
  DropdownRowContent,
} from "@/components/dropdown/DropdownRow";

/**
 * Gold bar of a rendered row.
 *
 * @param row - The row element.
 * @returns The bar element.
 */
function goldBar(row: HTMLElement): Element {
  const bar = row.querySelector(".bg-gold");
  if (!bar) {
    throw new Error("Gold bar not rendered");
  }
  return bar;
}

describe("DropdownRowContent", () => {
  it("shows the gold bar on the current row only", () => {
    render(
      <ul>
        <li data-testid="current">
          <DropdownRowContent label="Écrans" isCurrent />
        </li>
        <li data-testid="other">
          <DropdownRowContent label="Smartphones" isCurrent={false} />
        </li>
      </ul>,
    );
    expect(goldBar(screen.getByTestId("current"))).toHaveClass("opacity-100");
    expect(goldBar(screen.getByTestId("other"))).toHaveClass("opacity-0");
  });

  it("renders the icon and the detail only when given", () => {
    const { container } = render(
      <DropdownRowContent
        label="Portables"
        isCurrent={false}
        icon={Laptop}
        detail="576 produits"
      />,
    );
    expect(screen.getByText("576 produits")).toBeInTheDocument();
    // Icon + hover chevron.
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    const { container: bare } = render(<DropdownRowContent label="Par SMS" isCurrent={false} />);
    // Hover chevron only.
    expect(bare.querySelectorAll("svg")).toHaveLength(1);
  });

  it("never puts a background pill on the current row", () => {
    expect(DROPDOWN_ROW_CURRENT_CLASS).not.toMatch(/\bbg-/);
    // The pill only comes with the pointer, the keyboard focus or the Radix highlight.
    expect(DROPDOWN_ROW_CLASS).toContain("hover:bg-surface-2");
    expect(DROPDOWN_ROW_CLASS).toContain("data-highlighted:bg-surface-2");
    expect(DROPDOWN_ROW_CLASS).not.toMatch(/(^|\s)bg-/);
  });
});
