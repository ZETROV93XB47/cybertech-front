/**
 * Pieces of a published review shared by the product page (server) and « Voir plus d'avis »
 * (client): a row of stars named by its rating, and one review with its author's first name,
 * its date, its rating and its comment (FR-020: no other personal data).
 *
 * @see features/catalog/components/ProductReviews.tsx
 */
import { Star } from "lucide-react";
import type { ReactNode } from "react";

import { formatFullDay } from "@/lib/format";
import { cn } from "@/lib/utils";

import { REVIEW_MESSAGES } from "../messages";
import { REVIEW_MAX_RATING, REVIEW_RATINGS, type ProductReview } from "../reviews";

/**
 * Row of stars, filled up to a rating.
 *
 * @param props - Rating (may be fractional) and size classes.
 * @returns The stars, named by their rating for screen readers.
 */
export function ReviewStars({
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
 * One published review.
 *
 * @param props - The review.
 * @returns The list item.
 */
export function ReviewItem({ review }: { readonly review: ProductReview }): ReactNode {
  const day = formatFullDay(review.createdAt);
  return (
    <li className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <ReviewStars rating={review.rating} />
        <span className="font-medium text-text">
          {review.authorFirstName ?? REVIEW_MESSAGES.anonymousAuthor}
        </span>
        {day !== null && <span className="text-text-muted">{REVIEW_MESSAGES.postedOn(day)}</span>}
      </div>
      {review.comment !== null && review.comment !== "" && (
        <p className="text-sm whitespace-pre-line text-text">{review.comment}</p>
      )}
    </li>
  );
}
