/**
 * Conditions of a campaign (minimum order, cap, end date or « Sans date de fin »), each with a
 * check icon, on its card and its page (FR-013).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §4
 */
import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Props of {@link CampaignConditions}. */
export interface CampaignConditionsProps {
  readonly conditions: readonly string[];
  /** Accessible name of the list, on the campaign page. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Conditions list.
 *
 * @param props - Conditions, list name and classes.
 * @returns The list.
 */
export function CampaignConditions({
  conditions,
  label,
  className,
}: CampaignConditionsProps): ReactNode {
  return (
    <ul
      aria-label={label}
      className={cn("flex flex-col gap-1.5 text-sm text-text-muted", className)}
    >
      {conditions.map((condition) => (
        <li key={condition} className="flex items-center gap-2">
          <CircleCheck aria-hidden className="size-4 shrink-0 text-gold" />
          {condition}
        </li>
      ))}
    </ul>
  );
}
