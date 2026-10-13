"use client";

/**
 * « Comparer » control: a checkbox on the catalog cards, a toggle button on the product page.
 *
 * A product that cannot join the comparison keeps its control focusable: `aria-disabled`
 * rather than `disabled`, the reason linked by `aria-describedby` and shown in a tooltip on
 * hover and focus; activating it announces the reason instead of changing the selection
 * (FR-014). The control sits above the link stretched over the card (`relative z-10`).
 *
 * @see specs/002-catalog-refresh/research.md R9
 * @see specs/002-catalog-refresh/spec.md FR-013, FR-014
 */
import { Check, GitCompareArrows } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { CategoryKey } from "@/lib/enums/category-key";
import { CompareToggleVariant } from "@/lib/enums/compare-toggle-variant";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

import { useCompareSelection } from "../hooks/useCompareSelection";
import { COMPARE_REFUSAL_MESSAGES, COMPARE_TOGGLE_MESSAGES } from "../messages";
import { canAdd } from "../selection";

/** Props of {@link CompareToggle}. */
export interface CompareToggleProps {
  readonly productUuid: string;
  /** Product name, part of the checkbox accessible name. */
  readonly productName: string;
  readonly category: CategoryKey;
  readonly variant: CompareToggleVariant;
}

/** State shared by both variants. */
interface ToggleState {
  readonly isSelected: boolean;
  /** Why the product cannot be added, `null` when it can. */
  readonly reason: string | null;
  /** Text of the live region, set when a refused control is activated. */
  readonly announcement: string;
  readonly toggle: () => void;
}

/**
 * Reads the selection state of one product and builds its toggle action.
 *
 * @param productUuid - Product.
 * @param category - Its category.
 * @returns The toggle state.
 */
function useToggleState(productUuid: string, category: CategoryKey): ToggleState {
  const { selection, add, remove } = useCompareSelection();
  const [announcement, setAnnouncement] = useState("");
  const isSelected = selection?.uuids.includes(productUuid) ?? false;
  const refusal = isSelected ? null : canAdd(selection, productUuid, category);
  const reason = refusal === null ? null : COMPARE_REFUSAL_MESSAGES[refusal];
  const toggle = (): void => {
    if (isSelected) {
      remove([productUuid]);
      return;
    }
    const result = add(productUuid, category);
    setAnnouncement(result?.ok === false ? COMPARE_REFUSAL_MESSAGES[result.refusal] : "");
  };
  return { isSelected, reason, announcement, toggle };
}

/**
 * Reason of a refused control, shown on hover and focus of the group. It opens below the
 * control, inside the card (whose overflow is hidden), aligned on the control's outer edge.
 *
 * @param props - Element id, text and variant.
 * @returns The tooltip.
 */
function Reason({
  id,
  text,
  variant,
}: {
  readonly id: string;
  readonly text: string;
  readonly variant: CompareToggleVariant;
}): ReactNode {
  return (
    <span
      id={id}
      role="tooltip"
      className={cn(
        "invisible absolute top-full z-20 mt-2 w-56 rounded-field border border-border bg-surface p-2 text-xs text-text shadow-card group-focus-within:visible group-hover:visible",
        variant === CompareToggleVariant.CHECKBOX ? "right-0" : "left-0",
      )}
    >
      {text}
    </span>
  );
}

/** Starting scale of the check mark when it pops in at full effects. */
const CHECK_POP_SCALE = 0.4;

/**
 * Check mark shown next to « Comparer » once the product is selected: it pops in at full
 * effects and only fades otherwise (T071).
 *
 * @param props - Whether the product is selected.
 * @returns The animated mark.
 */
function SelectedMark({ isSelected }: { readonly isSelected: boolean }): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const hidden =
    mode === EntranceMode.MOVE ? { opacity: 0, scale: CHECK_POP_SCALE } : { opacity: 0 };
  return (
    <AnimatePresence initial={false}>
      {isSelected && (
        <motion.span
          aria-hidden
          data-entrance={mode}
          initial={hidden}
          animate={{ opacity: 1, scale: 1 }}
          exit={hidden}
          transition={tokens.fast}
          className="inline-flex text-brand-text"
        >
          <Check className="size-3.5" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * Comparison toggle of a product.
 *
 * @param props - Product, category and variant.
 * @returns The control, its reason tooltip and its live region.
 */
export function CompareToggle({
  productUuid,
  productName,
  category,
  variant,
}: CompareToggleProps): ReactNode {
  const { isSelected, reason, announcement, toggle } = useToggleState(productUuid, category);
  const reasonId = useId();
  const refusedProps = reason ? { "aria-disabled": true, "aria-describedby": reasonId } : undefined;
  return (
    <div className="group relative z-10 inline-flex">
      {variant === CompareToggleVariant.CHECKBOX ? (
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 text-xs text-text-muted",
            reason && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={toggle}
            aria-label={COMPARE_TOGGLE_MESSAGES.checkboxLabel(productName)}
            className="accent-brand"
            {...refusedProps}
          />
          {COMPARE_TOGGLE_MESSAGES.checkbox}
          <SelectedMark isSelected={isSelected} />
        </label>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={toggle}
          className={cn("rounded-button", reason && "cursor-not-allowed opacity-60")}
          {...refusedProps}
        >
          <GitCompareArrows aria-hidden />
          {isSelected ? COMPARE_TOGGLE_MESSAGES.remove : COMPARE_TOGGLE_MESSAGES.add}
        </Button>
      )}
      {reason && <Reason id={reasonId} text={reason} variant={variant} />}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
