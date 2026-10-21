/**
 * « Promotions » page (FR-012): the active discount campaigns, each with its photo, benefit and
 * conditions, linking to its page; an illustrated empty state when there is none.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4
 */
import { TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { RevealGroup, RevealItem } from "@/components/effects/Reveal";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { toCampaignView } from "@/features/promotions/campaign-view";
import { CampaignCard } from "@/features/promotions/components/CampaignCard";
import {
  PROMOTIONS_BREADCRUMB_MESSAGES,
  PROMOTIONS_MESSAGES,
} from "@/features/promotions/messages";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";

/** Page metadata. */
export const metadata: Metadata = {
  title: PROMOTIONS_MESSAGES.title,
  description: PROMOTIONS_MESSAGES.metaDescription,
};

/**
 * Promotions page.
 *
 * @returns The campaigns, or the empty state.
 * @throws {ApiError} When the backend is unavailable (the segment error page is shown).
 */
export default async function PromotionsPage(): Promise<ReactNode> {
  const campaigns = (await getActiveDiscounts()).map(toCampaignView);
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: PROMOTIONS_BREADCRUMB_MESSAGES.home },
              { href: null, label: PROMOTIONS_BREADCRUMB_MESSAGES.promotions },
            ]}
          />
        }
        title={<LiveTitle text={PROMOTIONS_MESSAGES.title} className={PAGE_TITLE_CLASS} />}
        subtitle={PROMOTIONS_MESSAGES.subtitle}
      />
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<TicketPercent className="size-10" />}
          title={PROMOTIONS_MESSAGES.emptyTitle}
          body={PROMOTIONS_MESSAGES.emptyBody}
          action={{ href: CATALOG_PATH, label: PROMOTIONS_MESSAGES.browseCatalog }}
        />
      ) : (
        <RevealGroup>
          <ul
            aria-label={PROMOTIONS_MESSAGES.listLabel}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {campaigns.map((campaign) => (
              <li key={campaign.key} className="flex">
                <RevealItem className="flex w-full">
                  <CampaignCard campaign={campaign} />
                </RevealItem>
              </li>
            ))}
          </ul>
        </RevealGroup>
      )}
    </PageShell>
  );
}
