/**
 * Page of one discount campaign (FR-013, FR-014): photo, benefit, conditions, « Appliquer à mon
 * panier » and « Voir le catalogue ». A malformed key, or a campaign that is not active, gives
 * the « campagne introuvable ou terminée » page of the segment.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4
 * @see specs/004-catalog-promos-reviews/data-model.md §4
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { toCampaignView, type CampaignView } from "@/features/promotions/campaign-view";
import { CampaignDetail } from "@/features/promotions/components/CampaignDetail";
import { CAMPAIGN_MESSAGES, PROMOTIONS_BREADCRUMB_MESSAGES } from "@/features/promotions/messages";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { HOME_PATH, PROMOTIONS_PATH } from "@/lib/constants/routes";
import { DiscountKeySchema } from "@/lib/schemas/discount";

/** Props of the page: the campaign key of the address. */
interface CampaignPageProps {
  readonly params: Promise<{ readonly key: string }>;
}

/**
 * Finds an active campaign by the key of the address.
 *
 * @param rawKey - Key segment of the address, still URL-encoded.
 * @returns The campaign view, or `null` when the key is malformed or not active.
 * @throws {ApiError} When the backend is unavailable.
 */
async function findCampaign(rawKey: string): Promise<CampaignView | null> {
  const parsed = DiscountKeySchema.safeParse(decodeURIComponent(rawKey));
  if (!parsed.success) {
    return null;
  }
  const discount = (await getActiveDiscounts()).find(
    (candidate) => candidate.discountKey.toUpperCase() === parsed.data,
  );
  return discount === undefined ? null : toCampaignView(discount);
}

/**
 * Metadata with the campaign name.
 *
 * @param props - Route parameters.
 * @returns The title and description of the page.
 */
export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const campaign = await findCampaign((await params).key);
  if (campaign === null) {
    return { title: CAMPAIGN_MESSAGES.notFoundTitle };
  }
  return { title: campaign.name, description: `${campaign.name} : ${campaign.benefit}` };
}

/**
 * Campaign page.
 *
 * @param props - Route parameters.
 * @returns The campaign details.
 * @throws {ApiError} When the backend is unavailable (the segment error page is shown).
 */
export default async function CampaignPage({ params }: CampaignPageProps): Promise<ReactNode> {
  const campaign = await findCampaign((await params).key);
  if (campaign === null) {
    notFound();
  }
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: PROMOTIONS_BREADCRUMB_MESSAGES.home },
              { href: PROMOTIONS_PATH, label: PROMOTIONS_BREADCRUMB_MESSAGES.promotions },
              { href: null, label: campaign.name },
            ]}
          />
        }
        title={<LiveTitle text={campaign.name} className={PAGE_TITLE_CLASS} />}
      />
      <CampaignDetail campaign={campaign} />
    </PageShell>
  );
}
