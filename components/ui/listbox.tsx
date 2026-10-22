"use client";

/**
 * Shared parts of the site's custom dropdown lists (Radix `Select`): the option with its gold
 * mark and check, and the chevron that turns while the list is open.
 *
 * Shared so the « Trier par » list of the catalog and the choice fields of the forms look and
 * behave the same way; the list surface and its opening come from `DropPanel`.
 *
 * @see components/effects/DropPanel.tsx
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Gap between a trigger and its list, in pixels (Radix `sideOffset`). */
export const LISTBOX_OFFSET_PX = 8;

/** Style of every option (Radix marks the one under the pointer or the keyboard). */
const ITEM_CLASS =
  "relative flex w-full cursor-pointer items-center gap-3 rounded-button py-2.5 pr-3 pl-4 text-sm text-text-muted outline-none select-none transition-colors duration-(--duration-fast) data-highlighted:bg-surface-2 data-highlighted:text-text";

/** Props of {@link ListboxItem}. */
export interface ListboxItemProps {
  /** Value submitted or applied when the option is chosen. */
  readonly value: string;
  /** Text of the option. */
  readonly label: string;
  /** Whether the option is the current choice (gold mark, check, stronger text). */
  readonly isCurrent: boolean;
}

/**
 * One option of a list: gold mark and check on the current one.
 *
 * @param props - Value, label and whether it is the current choice.
 * @returns The list option.
 */
export function ListboxItem({ value, label, isCurrent }: ListboxItemProps): ReactNode {
  return (
    <Select.Item value={value} className={cn(ITEM_CLASS, isCurrent && "font-medium text-text")}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-1 w-1 rounded-full bg-gold transition-opacity duration-(--duration-fast)",
          isCurrent ? "opacity-100" : "opacity-0",
        )}
      />
      <Select.ItemText>{label}</Select.ItemText>
      <Select.ItemIndicator className="ml-auto">
        <Check aria-hidden className="size-4 text-gold" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

/**
 * Chevron of a list trigger, turned while the list is open.
 *
 * @param props - Whether the list is open.
 * @returns The trigger icon.
 */
export function ListboxChevron({ isOpen }: { readonly isOpen: boolean }): ReactNode {
  return (
    <Select.Icon asChild>
      <ChevronDown
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-text-muted transition-transform duration-(--duration-fast)",
          isOpen && "rotate-180",
        )}
      />
    </Select.Icon>
  );
}
