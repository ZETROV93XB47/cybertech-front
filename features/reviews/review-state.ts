/**
 * State of the review forms (publish and edit) and how the submitted `FormData` is read and
 * checked. The typed rating and comment are always sent back, so nothing is lost on an error
 * (FR-017).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §5.3
 */
import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants/reviews";
import { ReviewField, ReviewFormStatus } from "@/lib/enums/review";
import { RatingSchema } from "@/lib/schemas/review";

import { REVIEW_FORM_MESSAGES } from "./messages";

/** Errors of the form, per field. */
export type ReviewFieldErrors = Partial<Record<ReviewField.RATING | ReviewField.COMMENT, string>>;

/** Why a review was not written, as the form shows it. */
export interface ReviewFailure {
  readonly formError: string;
  readonly fieldErrors?: ReviewFieldErrors;
  /** The session expired: offer to sign in again, never resend by itself. */
  readonly needsSignIn?: boolean;
  /** The product can no longer be reviewed, or the review is gone: refresh the lists. */
  readonly isStale?: boolean;
  readonly retryAfterSeconds?: number;
}

/** State of a review form after its last submission. */
export interface ReviewFormState extends Partial<ReviewFailure> {
  readonly status: ReviewFormStatus;
  /** Rating typed, `null` when none was chosen. */
  readonly rating: number | null;
  /** Comment typed, as is. */
  readonly comment: string;
  readonly fieldErrors: ReviewFieldErrors;
}

/** What the form submitted. */
export interface ReviewFormValues {
  readonly rating: number | null;
  readonly comment: string;
}

/**
 * Initial state of a form.
 *
 * @param values - Rating and comment to start from (empty to publish, the review to edit).
 * @returns The idle state.
 */
export function initialReviewState(values: ReviewFormValues): ReviewFormState {
  return { status: ReviewFormStatus.IDLE, ...values, fieldErrors: {} };
}

/**
 * Reads a text field of the form.
 *
 * @param formData - Submitted form.
 * @param field - Field name.
 * @returns Its value, `""` when missing or not text.
 */
export function readText(formData: FormData, field: ReviewField): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/**
 * Reads the rating and the comment of a submitted form.
 *
 * @param formData - Submitted form.
 * @returns The values, the rating `null` when missing or not 1 to 5.
 */
export function readReviewForm(formData: FormData): ReviewFormValues {
  const rating = RatingSchema.safeParse(Number(readText(formData, ReviewField.RATING)));
  return {
    rating: rating.success ? rating.data : null,
    comment: readText(formData, ReviewField.COMMENT),
  };
}

/**
 * Checks the rating and the comment before any call.
 *
 * @param values - Typed values.
 * @returns The field errors, empty when the values can be sent.
 */
export function validateReviewForm(values: ReviewFormValues): ReviewFieldErrors {
  const errors: ReviewFieldErrors = {};
  if (values.rating === null) {
    errors[ReviewField.RATING] = REVIEW_FORM_MESSAGES.errors.rating;
  }
  if (values.comment.trim().length > REVIEW_COMMENT_MAX_LENGTH) {
    errors[ReviewField.COMMENT] = REVIEW_FORM_MESSAGES.errors.commentTooLong;
  }
  return errors;
}
