/**
 * « Avis clients » section of the product page, laid out like LDLC: average rating with stars,
 * distribution of the ratings, then the reviews, or an invitation when there is none.
 *
 * The page passes the first page of reviews (`GET /review/product/{uuid}`), or `NO_REVIEWS` when
 * they cannot be read: the section then shows the honest empty state, never a made-up figure
 * (FR-020). The next pages come through « Voir plus d'avis » (`MoreReviews`).
 *
 * @see features/catalog/reviews.ts
 */
import { MessageSquareText } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { StateIllustration } from "@/components/effects/StateIllustration";
import { UI_LOCALE } from "@/lib/format";

import { REVIEW_MESSAGES } from "../messages";
import { REVIEW_RATINGS, type ProductReviews } from "../reviews";

import { MoreReviews } from "./MoreReviews";
import { ReviewItem, ReviewStars } from "./ReviewItem";

/** Digits of the displayed average (« 4,3 »). */
const AVERAGE_FRACTION_DIGITS = 1;

/** Full width of a distribution bar, in percent. */
const FULL_BAR_PERCENT = 100;

/**
 * Average rating and number of reviews.
 *
 * @param props - Reviews of the product.
 * @returns The summary column.
 */
function Summary({ reviews }: { readonly reviews: ProductReviews }): ReactNode {
  const average =
    reviews.average === null
      ? REVIEW_MESSAGES.noAverage
      : REVIEW_MESSAGES.average(
          reviews.average.toLocaleString(UI_LOCALE, {
            maximumFractionDigits: AVERAGE_FRACTION_DIGITS,
          }),
        );
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-display text-4xl text-text">{average}</p>
      <ReviewStars rating={reviews.average ?? 0} className="size-5" />
      <p className="text-sm text-text-muted">{REVIEW_MESSAGES.count(reviews.count)}</p>
    </div>
  );
}

/**
 * Number of reviews per rating, as bars.
 *
 * @param props - Reviews of the product.
 * @returns The distribution list.
 */
function Distribution({ reviews }: { readonly reviews: ProductReviews }): ReactNode {
  return (
    <ul aria-label={REVIEW_MESSAGES.distributionLabel} className="flex flex-col gap-2 text-sm">
      {REVIEW_RATINGS.map((rating) => {
        const count = reviews.distribution[rating] ?? 0;
        const share = reviews.count === 0 ? 0 : (count / reviews.count) * FULL_BAR_PERCENT;
        const barStyle: CSSProperties = { width: `${share}%` };
        return (
          <li key={rating} className="flex items-center gap-3">
            <span className="w-20 text-text-muted">{REVIEW_MESSAGES.starsLabel(rating)}</span>
            <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-gold" style={barStyle} />
            </span>
            <span className="w-8 text-right font-mono text-text-muted">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The reviews, or an invitation to write the first one.
 *
 * @param props - Product and its reviews.
 * @returns The list (with « Voir plus d'avis ») or the empty state.
 */
function ReviewList({
  productUuid,
  reviews,
}: {
  readonly productUuid: string;
  readonly reviews: ProductReviews;
}): ReactNode {
  if (reviews.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <StateIllustration icon={<MessageSquareText className="size-8" />} />
        <h3 className="text-base">{REVIEW_MESSAGES.emptyTitle}</h3>
        <p className="max-w-prose text-sm text-text-muted">{REVIEW_MESSAGES.emptyBody}</p>
      </div>
    );
  }
  return (
    <MoreReviews productUuid={productUuid} firstPage={reviews.page} hasMore={reviews.hasMore}>
      {reviews.items.map((review) => (
        <ReviewItem key={review.uuid} review={review} />
      ))}
    </MoreReviews>
  );
}

/**
 * Customer reviews section.
 *
 * @param props - Product and its reviews.
 * @returns The section.
 */
export function ProductReviewsSection({
  productUuid,
  reviews,
}: {
  readonly productUuid: string;
  readonly reviews: ProductReviews;
}): ReactNode {
  return (
    <section aria-labelledby="reviews-title" className="glass flex flex-col gap-6 rounded-card p-6">
      <h2 id="reviews-title" className="text-xl">
        {REVIEW_MESSAGES.title}
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        <Summary reviews={reviews} />
        <Distribution reviews={reviews} />
        <ReviewList productUuid={productUuid} reviews={reviews} />
      </div>
    </section>
  );
}
