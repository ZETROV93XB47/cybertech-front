/**
 * Benefit badge of a campaign (« −20 % », « 1 acheté = 1 offert »), on its card and its page.
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §4
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Props of {@link CampaignBenefit}. */
export interface CampaignBenefitProps {
  readonly benefit: string;
  /** Larger badge, on the campaign page. */
  readonly large?: boolean;
}

/**
 * Benefit badge.
 *
 * @param props - Benefit text and size.
 * @returns The badge.
 */
export function CampaignBenefit({ benefit, large = false }: CampaignBenefitProps): ReactNode {
  return (
    <span
      data-testid="campaign-benefit"
      className={cn(
        "cta-gradient inline-flex items-center rounded-full font-display font-semibold shadow-cta",
        large ? "px-5 py-2 text-3xl" : "px-3 py-1 text-base",
      )}
    >
      {benefit}
    </span>
  );
}
