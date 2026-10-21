/**
 * Body of a campaign page: photo, benefit, conditions (minimum, cap, end date or « Sans date de
 * fin »), « Appliquer à mon panier » and « Voir le catalogue » (FR-013, FR-014). The title is the
 * page header's.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4 scenarios 2 to 4
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { buttonVariants } from "@/components/ui/button";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { THEME } from "@/lib/theme/theme.config";
import { cn } from "@/lib/utils";

import type { CampaignView } from "../campaign-view";
import { CAMPAIGN_MESSAGES } from "../messages";

import { ApplyCampaignButton } from "./ApplyCampaignButton";
import { CampaignBenefit } from "./CampaignBenefit";
import { CampaignConditions } from "./CampaignConditions";

/** Id of the conditions heading, naming the conditions section. */
const CONDITIONS_TITLE_ID = "campaign-conditions-title";

/** Props of {@link CampaignDetail}. */
export interface CampaignDetailProps {
  readonly campaign: CampaignView;
}

/**
 * Campaign photo, tilting at full effects.
 *
 * @param props - The campaign.
 * @returns The framed photo.
 */
function CampaignPhoto({ campaign }: CampaignDetailProps): ReactNode {
  return (
    <TiltCard className="glass relative aspect-video w-full overflow-hidden rounded-card">
      <Image
        src={campaign.image}
        alt={campaign.imageAlt}
        fill
        priority
        sizes={THEME.media.campaignDetail.sizes}
        placeholder="blur"
        className="object-cover"
      />
    </TiltCard>
  );
}

/**
 * Campaign details.
 *
 * @param props - The campaign.
 * @returns The photo beside the benefit, the conditions and the actions.
 */
export function CampaignDetail({ campaign }: CampaignDetailProps): ReactNode {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <CampaignPhoto campaign={campaign} />
      <div className="glass flex flex-col gap-6 rounded-card p-8">
        <div className="flex flex-wrap items-center gap-4">
          <CampaignBenefit benefit={campaign.benefit} large />
          <span className="font-mono text-sm text-text-muted">
            {CAMPAIGN_MESSAGES.keyLabel(campaign.key)}
          </span>
        </div>
        <section aria-labelledby={CONDITIONS_TITLE_ID} className="flex flex-col gap-3">
          <h2 id={CONDITIONS_TITLE_ID} className="text-lg">
            {CAMPAIGN_MESSAGES.conditionsTitle}
          </h2>
          <CampaignConditions conditions={campaign.conditions} className="text-base" />
          <p className="text-sm text-text-muted">{CAMPAIGN_MESSAGES.hint}</p>
        </section>
        <ApplyCampaignButton
          campaignKey={campaign.key}
          campaignName={campaign.name}
          secondaryAction={
            <Link
              href={CATALOG_PATH}
              className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-text-muted")}
            >
              {CAMPAIGN_MESSAGES.seeCatalog}
            </Link>
          }
        />
      </div>
    </div>
  );
}
