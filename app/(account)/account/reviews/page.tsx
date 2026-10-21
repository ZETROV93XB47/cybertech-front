/**
 * « Mes avis » (feature 004, US5): the products the customer can review, then their published
 * reviews, newest first, ten per page (`?page=`). `?product=&order=` (link « Donner mon avis » of
 * the order detail, FR-019) opens the form of that product. Private, never cached.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5, FR-015
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { MyReviewsPanel } from "@/features/reviews/components/MyReviewsPanel";
import { MY_REVIEWS_MESSAGES } from "@/features/reviews/messages";
import {
  FIRST_MY_REVIEWS_PAGE,
  myReviewsPagePath,
  toMyReviewsView,
} from "@/features/reviews/my-reviews-view";
import { getMyReviews, getReviewableProducts } from "@/lib/api/endpoints/reviews";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { MY_REVIEWS_PAGE_PARAM } from "@/lib/constants/reviews";
import { HOME_PATH, REVIEW_TARGET_PARAMS } from "@/lib/constants/routes";

/** Accepted `?page=`: a positive integer, anything else is the first page. */
const PageParamSchema = z.coerce
  .number()
  .int()
  .min(FIRST_MY_REVIEWS_PAGE)
  .catch(FIRST_MY_REVIEWS_PAGE);

/** Accepted `?product=` and `?order=`: UUIDs, anything else opens no form. */
const TargetParamSchema = z.uuid().optional().catch(undefined);

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: MY_REVIEWS_MESSAGES.metaTitle,
  description: MY_REVIEWS_MESSAGES.pageDescription,
  robots: { index: false },
};

/** Props of the page. */
interface MyReviewsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Row to open from `?product=&order=`.
 *
 * @param params - Search params of the page.
 * @returns `{productUuid}:{orderUuid}`, or `null` when either is missing or malformed.
 */
function initialOpenId(params: Record<string, string | string[] | undefined>): string | null {
  const product = TargetParamSchema.parse(params[REVIEW_TARGET_PARAMS.product]);
  const order = TargetParamSchema.parse(params[REVIEW_TARGET_PARAMS.order]);
  return product === undefined || order === undefined ? null : `${product}:${order}`;
}

/**
 * « Mes avis ».
 *
 * @param props - Search params.
 * @returns The header and the two lists.
 * @throws {ApiError} When the backend is unavailable (the segment error page is shown).
 */
export default async function MyReviewsPage({
  searchParams,
}: MyReviewsPageProps): Promise<ReactNode> {
  const params = await searchParams;
  const page = PageParamSchema.parse(params[MY_REVIEWS_PAGE_PARAM]);
  const accessToken = await getAccessTokenOrRedirect(myReviewsPagePath(page));
  const [reviewable, mine] = await Promise.all([
    getReviewableProducts(accessToken),
    getMyReviews(page, accessToken),
  ]);
  if (mine.content.length === 0 && page > FIRST_MY_REVIEWS_PAGE) {
    redirect(myReviewsPagePath(Math.max(FIRST_MY_REVIEWS_PAGE, mine.page.totalPages)));
  }
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: MY_REVIEWS_MESSAGES.breadcrumb },
            ]}
          />
        }
        title={<LiveTitle text={MY_REVIEWS_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={MY_REVIEWS_MESSAGES.pageDescription}
      />
      <MyReviewsPanel
        view={toMyReviewsView(reviewable, mine, page)}
        initialOpenId={initialOpenId(params)}
      />
    </>
  );
}
