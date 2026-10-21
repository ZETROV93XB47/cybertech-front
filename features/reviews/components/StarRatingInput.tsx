"use client";

/**
 * Star rating of the review form: a radio group « 1 étoile » … « 5 étoiles » (Radix), usable with
 * the arrow keys, submitted with the form under `rating` (FR-016). The stars fill up to the
 * chosen rating; the value is also written out, so it is not conveyed by colour alone.
 *
 * @see specs/004-catalog-promos-reviews/spec.md FR-016
 */
import { Star } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useState, type ReactNode } from "react";

import { REVIEW_MAX_RATING, REVIEW_MIN_RATING } from "@/lib/constants/reviews";
import { ReviewField } from "@/lib/enums/review";
import { cn } from "@/lib/utils";

import { REVIEW_FORM_MESSAGES } from "../messages";

/** Ratings offered, lowest first (reading order of the stars). */
const RATINGS: readonly number[] = Array.from(
  { length: REVIEW_MAX_RATING - REVIEW_MIN_RATING + 1 },
  (_, index) => index + REVIEW_MIN_RATING,
);

/** Props of {@link StarRatingInput}. */
export interface StarRatingInputProps {
  /** Rating to start from, `null` for none. */
  readonly defaultValue: number | null;
  /** Error of the field, shown under the stars. */
  readonly error?: string | undefined;
}

/**
 * Star rating radio group.
 *
 * @param props - Initial rating and error.
 * @returns The fieldset.
 */
export function StarRatingInput({ defaultValue, error }: StarRatingInputProps): ReactNode {
  const [value, setValue] = useState(defaultValue === null ? "" : String(defaultValue));
  const legendId = useId();
  const errorId = useId();
  const rating = Number(value);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id={legendId} className="mb-1 text-sm font-medium text-text">
        {REVIEW_FORM_MESSAGES.ratingLegend}
      </legend>
      <div className="flex items-center gap-3">
        <RadioGroup.Root
          name={ReviewField.RATING}
          value={value}
          onValueChange={setValue}
          required
          orientation="horizontal"
          aria-labelledby={legendId}
          aria-describedby={error === undefined ? undefined : errorId}
          aria-invalid={error === undefined ? undefined : true}
          className="flex gap-1"
        >
          {RATINGS.map((star) => (
            <RadioGroup.Item
              key={star}
              value={String(star)}
              aria-label={REVIEW_FORM_MESSAGES.starName(star)}
              className="rounded-button p-1 text-border transition-colors duration-(--duration-fast) hover:text-gold focus-visible:outline-2 focus-visible:outline-brand-text"
            >
              <Star aria-hidden className={cn("size-7", star <= rating && "fill-gold text-gold")} />
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        {value !== "" && (
          <span aria-hidden className="font-mono text-sm text-text-muted">
            {REVIEW_FORM_MESSAGES.starName(rating)}
          </span>
        )}
      </div>
      {error !== undefined && (
        <p id={errorId} className="text-sm text-rose">
          {error}
        </p>
      )}
    </fieldset>
  );
}
