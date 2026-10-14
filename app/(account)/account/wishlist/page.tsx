/**
 * « Ma wishlist » (feature 003 US6): the products the user kept aside, newest first, one page
 * of the backend at a time (`?page=`, 1-based). Private page, guarded by the proxy and the
 * `(account)` layout; read on the server with the user's token, never cached.
 *
 * @see specs/003-account-orders/spec.md US6, FR-037
 * @see specs/003-account-orders/research.md R22
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { WishlistList } from "@/features/wishlist/components/WishlistList";
import { WISHLIST_MESSAGES } from "@/features/wishlist/messages";
import { toWishlistRows, wishlistPagePath } from "@/features/wishlist/wishlist-view";
import { getMyWishlist } from "@/lib/api/endpoints/wishlist";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { HOME_PATH } from "@/lib/constants/routes";
import { WISHLIST_PAGE_PARAM } from "@/lib/constants/wishlist";

/** First page (1-based), used when `?page=` is missing or invalid. */
const FIRST_PAGE = 1;

/** Accepted `?page=`: a positive integer, anything else is the first page. */
const PageParamSchema = z.coerce.number().int().min(FIRST_PAGE).catch(FIRST_PAGE);

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: WISHLIST_MESSAGES.metaTitle,
  description: WISHLIST_MESSAGES.pageDescription,
  robots: { index: false },
};

/** Props of the wishlist page. */
interface WishlistPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Wishlist page.
 *
 * @param props - Page props.
 * @param props.searchParams - Query string, read for `?page=`.
 * @returns Header and wishlist.
 * @throws {ApiError} When the backend cannot read the wishlist (error boundary).
 */
export default async function WishlistPage({
  searchParams,
}: WishlistPageProps): Promise<ReactNode> {
  const page = PageParamSchema.parse((await searchParams)[WISHLIST_PAGE_PARAM]);
  const accessToken = await getAccessTokenOrRedirect(wishlistPagePath(page));
  const wishlist = await getMyWishlist(page, accessToken);
  if (wishlist.content.length === 0 && page > FIRST_PAGE) {
    redirect(wishlistPagePath(Math.max(FIRST_PAGE, wishlist.page.totalPages)));
  }
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: WISHLIST_MESSAGES.breadcrumb },
            ]}
          />
        }
        title={<LiveTitle text={WISHLIST_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={WISHLIST_MESSAGES.pageDescription}
      />
      <WishlistList
        rows={toWishlistRows(wishlist.content)}
        page={page}
        totalPages={wishlist.page.totalPages}
      />
    </PageShell>
  );
}
