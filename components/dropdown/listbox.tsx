"use client";

/**
 * Shared parts of the site's dropdown lists (Radix `Select`): the option, built on the common
 * {@link DropdownRowContent} so a list looks like the « Catalogue » menu, and the chevron of a
 * trigger, which turns while the list is open.
 *
 * Used by the « Trier par » list of the catalog and by {@link ListboxSelect} (form fields); the
 * list surface and its opening come from `DropPanel`.
 *
 * @see components/dropdown/DropdownRow.tsx
 * @see components/effects/DropPanel.tsx
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { DROPDOWN_ROW_CLASS, DROPDOWN_ROW_CURRENT_CLASS, DropdownRowContent } from "./DropdownRow";

/** Gap between a trigger and its list, in pixels (Radix `sideOffset`). */
export const LISTBOX_OFFSET_PX = 8;

/** Props of {@link ListboxItem}. */
export interface ListboxItemProps {
  /** Value submitted or applied when the option is chosen. */
  readonly value: string;
  /** Text of the option. */
  readonly label: string;
  /** Whether the option is the current choice (gold bar, brighter text). */
  readonly isCurrent: boolean;
}

/**
 * One option of a list, styled like a row of the « Catalogue » menu. The chosen option is told
 * to screen readers by Radix (`aria-selected`) and shown by the gold bar.
 *
 * @param props - Value, label and whether it is the current choice.
 * @returns The list option.
 */
export function ListboxItem({ value, label, isCurrent }: ListboxItemProps): ReactNode {
  return (
    <Select.Item
      value={value}
      className={cn(DROPDOWN_ROW_CLASS, isCurrent && DROPDOWN_ROW_CURRENT_CLASS)}
    >
      <DropdownRowContent
        label={<Select.ItemText>{label}</Select.ItemText>}
        isCurrent={isCurrent}
      />
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
