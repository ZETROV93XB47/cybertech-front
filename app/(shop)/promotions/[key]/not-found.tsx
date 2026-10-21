/**
 * « Campagne introuvable ou terminée » page (FR-013), shown for a malformed key or a campaign
 * that is not active any more.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4 scenario 5
 */
import { SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MagneticButton } from "@/components/effects/MagneticButton";
import { StateIllustration } from "@/components/effects/StateIllustration";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { PageShell } from "@/components/layout/PageShell";
import { CAMPAIGN_MESSAGES } from "@/features/promotions/messages";
import { PROMOTIONS_PATH } from "@/lib/constants/routes";

/**
 * Campaign not found.
 *
 * @returns The message and a link to the current promotions.
 */
export default function CampaignNotFound(): ReactNode {
  return (
    <PageShell>
      <section className="glass flex flex-col items-start gap-4 rounded-card p-8">
        <StateIllustration icon={<SearchX className="size-10" />} />
        <h1 className="text-3xl">{CAMPAIGN_MESSAGES.notFoundTitle}</h1>
        <p className="max-w-prose text-text-muted">{CAMPAIGN_MESSAGES.notFoundBody}</p>
        <MagneticButton>
          <Link href={PROMOTIONS_PATH} className={PRIMARY_CTA_CLASS}>
            {CAMPAIGN_MESSAGES.backToPromotions}
          </Link>
        </MagneticButton>
      </section>
    </PageShell>
  );
}
