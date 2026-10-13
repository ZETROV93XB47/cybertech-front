/**
 * « Avis clients » section of the product page, laid out like LDLC: average rating with stars,
 * distribution of the ratings, then the reviews, or an invitation when there is none.
 *
 * The backend cannot list the reviews of a product yet, so the page passes `NO_REVIEWS` and the
 * section shows the honest empty state; it fills itself once the endpoint exists.
 *
 * @see features/catalog/reviews.ts
 */
import { MessageSquareText, Star } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { StateIllustration } from "@/components/effects/StateIllustration";
import { UI_LOCALE } from "@/lib/format";
import { cn } from "@/lib/utils";

import { REVIEW_MESSAGES } from "../messages";
import { REVIEW_MAX_RATING, REVIEW_RATINGS, type ProductReviews } from "../reviews";

/** Digits of the displayed average (« 4,3 »). */
const AVERAGE_FRACTION_DIGITS = 1;

/** Full width of a distribution bar, in percent. */
const FULL_BAR_PERCENT = 100;

/**
 * Row of stars, filled up to a rating.
 *
 * @param props - Rating (may be fractional) and size classes.
 * @returns The stars, named by their rating for screen readers.
 */
function Stars({
  rating,
  className,
}: {
  readonly rating: number;
  readonly className?: string;
}): ReactNode {
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={REVIEW_MESSAGES.ratingLabel(rating)} className="flex gap-0.5">
      {REVIEW_RATINGS.map((position) => (
        <Star
          key={position}
          aria-hidden
          className={cn(
            "size-4",
            REVIEW_MAX_RATING - position < filled ? "fill-gold text-gold" : "text-border",
            className,
          )}
        />
      ))}
    </span>
  );
}

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
      <Stars rating={reviews.average ?? 0} className="size-5" />
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
 * @param props - Reviews of the product.
 * @returns The list or the empty state.
 */
function ReviewList({ reviews }: { readonly reviews: ProductReviews }): ReactNode {
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
    <ul aria-label={REVIEW_MESSAGES.listLabel} className="flex flex-col gap-4">
      {reviews.items.map((review) => (
        <li key={review.uuid} className="flex flex-col gap-2 border-b border-border pb-4">
          <Stars rating={review.rating} />
          {review.comment && <p className="text-sm text-text">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Customer reviews section.
 *
 * @param props - Reviews of the product.
 * @returns The section.
 */
export function ProductReviewsSection({
  reviews,
}: {
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
        <ReviewList reviews={reviews} />
      </div>
    </section>
  );
}
