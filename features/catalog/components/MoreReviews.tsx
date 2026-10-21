"use client";

/**
 * « Voir plus d'avis » on the product page: loads the next pages of reviews through the BFF route
 * and appends them under the first ones, announcing how many were added (FR-022). The first
 * reviews come rendered by the server as `children`; the button is hidden when every review is
 * shown.
 *
 * @see specs/004-catalog-promos-reviews/contracts/bff-routes.md §1
 */
import { useState, type ReactNode } from "react";

import { bffGet } from "@/lib/api/bff-client";
import { PRODUCT_REVIEWS_PAGE_PARAM, productReviewsRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { REVIEW_MESSAGES } from "../messages";
import { ProductReviewsSchema, type ProductReview } from "../reviews";

import { ReviewItem } from "./ReviewItem";

/** Props of {@link MoreReviews}. */
export interface MoreReviewsProps {
  readonly productUuid: string;
  /** 0-based page already shown by the server. */
  readonly firstPage: number;
  /** Whether more pages exist after it. */
  readonly hasMore: boolean;
  /** Reviews of the first page, rendered by the server. */
  readonly children: ReactNode;
}

/** What the loader shows. */
interface MoreState {
  readonly items: readonly ProductReview[];
  readonly page: number;
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  /** Polite announcement of the last load. */
  readonly announcement: string;
}

/**
 * Loader of the next review pages.
 *
 * @param props - Product, first page shown, whether more exist and the first reviews.
 * @returns The list of reviews, the button and the live region.
 */
export function MoreReviews({
  productUuid,
  firstPage,
  hasMore,
  children,
}: MoreReviewsProps): ReactNode {
  const [state, setState] = useState<MoreState>({
    items: [],
    page: firstPage,
    hasMore,
    isLoading: false,
    announcement: "",
  });
  const loadMore = async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, announcement: "" }));
    const params = new URLSearchParams({ [PRODUCT_REVIEWS_PAGE_PARAM]: String(state.page + 1) });
    try {
      const next = await bffGet(productReviewsRoute(productUuid), params, ProductReviewsSchema);
      setState((current) => ({
        items: [...current.items, ...next.items],
        page: next.page,
        hasMore: next.hasMore,
        isLoading: false,
        announcement: REVIEW_MESSAGES.moreLoaded(next.items.length),
      }));
    } catch {
      setState((current) => ({
        ...current,
        isLoading: false,
        announcement: REVIEW_MESSAGES.moreFailed,
      }));
    }
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <ul aria-label={REVIEW_MESSAGES.listLabel} className="flex w-full flex-col gap-4">
        {children}
        {state.items.map((review) => (
          <ReviewItem key={review.uuid} review={review} />
        ))}
      </ul>
      {state.hasMore && (
        <button
          type="button"
          onClick={() => {
            void loadMore();
          }}
          disabled={state.isLoading}
          aria-busy={state.isLoading}
          className={cn(buttonVariants({ variant: "ghost" }), "px-0 text-brand-text")}
        >
          {state.isLoading ? REVIEW_MESSAGES.loadingMore : REVIEW_MESSAGES.more}
        </button>
      )}
      <p role="status" aria-live="polite" className="text-sm text-text-muted">
        {state.announcement}
      </p>
    </div>
  );
}
