/**
 * One campaign of the « Promotions » page: photo, name, benefit, conditions and a link to its
 * page (FR-012). The whole card is clickable through the stretched name link; the card tilts
 * under the pointer at full effects only (`TiltCard`).
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4 scenario 1
 */
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { THEME } from "@/lib/theme/theme.config";

import type { CampaignView } from "../campaign-view";
import { PROMOTIONS_MESSAGES } from "../messages";

import { CampaignBenefit } from "./CampaignBenefit";
import { CampaignConditions } from "./CampaignConditions";

/** Props of {@link CampaignCard}. */
export interface CampaignCardProps {
  readonly campaign: CampaignView;
}

/**
 * Campaign card.
 *
 * @param props - The campaign.
 * @returns The card, an `article` headed by the campaign name.
 */
export function CampaignCard({ campaign }: CampaignCardProps): ReactNode {
  return (
    <TiltCard className="glass relative flex h-full w-full flex-col overflow-hidden rounded-card">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <Image
          src={campaign.image}
          alt={campaign.imageAlt}
          fill
          sizes={THEME.media.campaignCard.sizes}
          placeholder="blur"
          className="object-cover"
        />
        <span className="absolute top-4 left-4">
          <CampaignBenefit benefit={campaign.benefit} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="font-display text-xl">
          <Link href={campaign.href} className="text-text after:absolute after:inset-0">
            {campaign.name}
          </Link>
        </h2>
        <CampaignConditions conditions={campaign.conditions} />
        <span
          aria-hidden
          className="mt-auto inline-flex items-center gap-2 pt-2 text-sm text-brand-text"
        >
          {PROMOTIONS_MESSAGES.seeCampaign}
          <ArrowRight className="size-4" />
        </span>
      </div>
    </TiltCard>
  );
}
