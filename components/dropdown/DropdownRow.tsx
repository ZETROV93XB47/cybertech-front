/**
 * Row of every dropdown of the site: header menus (« Catalogue », account), choice lists
 * (« Trier par ») and form lists (contact channel, card network and expiry).
 *
 * The site rule is that every dropdown looks like the « Catalogue » menu and looks the same on
 * every page: `DropPanel` surface, muted text that lights up on a `surface-2` pill under the
 * pointer, the keyboard focus or the Radix highlight, an optional icon that slides, a chevron
 * that shows on hover. The current page or the chosen option only gets the gold bar on the left
 * (no background pill), so a menu opened on its own page barely differs from the same menu
 * opened elsewhere; screen readers get `aria-current` or `aria-selected` from the caller.
 *
 * @see components/effects/DropPanel.tsx
 * @see CLAUDE.md « Interface paramétrable », dropdown rule
 */
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Style of a dropdown row. Works on links and buttons (hover, keyboard focus) and on Radix list
 * options (`data-highlighted`, set under the pointer and the keyboard).
 */
export const DROPDOWN_ROW_CLASS =
  "group relative flex w-full cursor-pointer items-center gap-3 rounded-button px-3 py-2.5 text-left text-sm text-text-muted outline-none select-none transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text data-highlighted:bg-surface-2 data-highlighted:text-text";

/** Extra style of the current page or chosen option: brighter text, no background pill. */
export const DROPDOWN_ROW_CURRENT_CLASS = "text-text";

/** Props of {@link DropdownRowContent}. */
export interface DropdownRowContentProps {
  /** Text of the row; a node so that a Radix option can wrap it in `Select.ItemText`. */
  readonly label: ReactNode;
  /** Whether the row is the current page or the chosen option (gold bar). */
  readonly isCurrent: boolean;
  /** Icon before the label; menus of categories have one, choice lists usually do not. */
  readonly icon?: LucideIcon | undefined;
  /** Short text on the right (e.g. a product count). */
  readonly detail?: string | undefined;
}

/**
 * Inside of a dropdown row: gold bar, optional icon, label, optional detail and hover chevron.
 *
 * @param props - Label, current state, icon and detail.
 * @returns The row content (the caller renders the link, button or option around it).
 */
export function DropdownRowContent({
  label,
  isCurrent,
  icon: Icon,
  detail,
}: DropdownRowContentProps): ReactNode {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-1 w-1 rounded-full bg-gold transition-opacity duration-(--duration-fast)",
          isCurrent ? "opacity-100" : "opacity-0",
        )}
      />
      {Icon !== undefined && (
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-brand-text group-data-highlighted:translate-x-0.5 group-data-highlighted:text-brand-text",
            isCurrent && "text-gold",
          )}
        />
      )}
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {detail !== undefined && (
        <span className="font-mono text-xs text-text-muted tabular-nums">{detail}</span>
      )}
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 -translate-x-1 opacity-0 transition duration-(--duration-fast) group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-highlighted:translate-x-0 group-data-highlighted:opacity-100"
      />
    </>
  );
}
