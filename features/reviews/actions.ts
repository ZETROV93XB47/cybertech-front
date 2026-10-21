"use server";

/**
 * Server Actions of the reviews (feature 004, US5): publish, edit and delete a review.
 *
 * Each action checks the input with Zod before any call, reads the user's token on the server and
 * never logs a comment nor a first name (the endpoints log masked UUIDs and the rating). After a
 * write, « Mes avis », the order detail and the product reviews are refreshed at once
 * (`updateTag`: the author reads their own review right away).
 *
 * @see specs/004-catalog-promos-reviews/contracts/bff-routes.md §2
 */
import { revalidatePath, updateTag } from "next/cache";

import {
  createReview as publishReview,
  deleteReview as removeReview,
  updateReview as editReview,
} from "@/lib/api/endpoints/reviews";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { productReviewsTag } from "@/lib/constants/reviews";
import { ACCOUNT_PATHS, orderPath } from "@/lib/constants/routes";
import { ReviewField, ReviewFormStatus } from "@/lib/enums/review";
import {
  ReviewCreateBodySchema,
  ReviewDeleteInputSchema,
  ReviewUpdateBodySchema,
  type ReviewDeleteInput,
} from "@/lib/schemas/review";

import { REVIEW_FORM_MESSAGES } from "./messages";
import { toReviewFailure } from "./review-errors";
import {
  readReviewForm,
  readText,
  validateReviewForm,
  type ReviewFailure,
  type ReviewFormState,
  type ReviewFormValues,
} from "./review-state";

/** Result of a deletion. */
export interface ReviewDeleteState extends Partial<ReviewFailure> {
  readonly status: ReviewFormStatus;
}

/**
 * Refreshes the pages that show a review of this product.
 *
 * @param productUuid - Reviewed product.
 * @param orderUuid - Order it was bought in, when known.
 */
function refreshReviewPages(productUuid: string, orderUuid: string | null): void {
  revalidatePath(ACCOUNT_PATHS.reviews);
  if (orderUuid !== null) {
    revalidatePath(orderPath(orderUuid));
  }
  updateTag(productReviewsTag(productUuid));
}

/**
 * Error state keeping the typed values.
 *
 * @param values - Typed rating and comment.
 * @param failure - What went wrong.
 * @returns The state.
 */
function errorState(values: ReviewFormValues, failure: ReviewFailure): ReviewFormState {
  return {
    status: ReviewFormStatus.ERROR,
    ...values,
    ...failure,
    fieldErrors: failure.fieldErrors ?? {},
  };
}

/**
 * Checks the typed values, or returns the error state to show.
 *
 * @param values - Typed rating and comment.
 * @returns The error state, or `null` when the values can be sent.
 */
function invalidState(values: ReviewFormValues): ReviewFormState | null {
  const fieldErrors = validateReviewForm(values);
  if (Object.keys(fieldErrors).length === 0) {
    return null;
  }
  return errorState(values, { formError: REVIEW_FORM_MESSAGES.errors.form, fieldErrors });
}

/**
 * Publishes a review of a bought product (`POST /review/create`). A comment refused by the
 * moderation keeps the rating and the comment (FR-017); an expired session invites to sign in
 * again and never publishes by itself.
 *
 * @param _previous - Previous state (unused: each submission is complete).
 * @param formData - Rating, comment, order and product.
 * @returns The new form state.
 * @see specs/004-catalog-promos-reviews/spec.md US5 scenarios 2 and 3
 */
export async function createReview(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const values = readReviewForm(formData);
  const invalid = invalidState(values);
  if (invalid !== null) {
    return invalid;
  }
  const body = ReviewCreateBodySchema.safeParse({
    orderUuid: readText(formData, ReviewField.ORDER_UUID),
    productUuid: readText(formData, ReviewField.PRODUCT_UUID),
    rating: values.rating,
    comment: values.comment,
  });
  if (!body.success) {
    return errorState(values, { formError: REVIEW_FORM_MESSAGES.errors.form });
  }
  try {
    await publishReview(body.data, await getAccessTokenOrThrow());
  } catch (error) {
    return errorState(values, toReviewFailure(error));
  }
  refreshReviewPages(body.data.productUuid, body.data.orderUuid);
  return { status: ReviewFormStatus.SUCCESS, ...values, fieldErrors: {} };
}

/**
 * Edits a review of the caller (`PATCH /review/update/{uuid}`); an emptied comment leaves a
 * rating-only review.
 *
 * @param _previous - Previous state (unused).
 * @param formData - Rating, comment, review and product.
 * @returns The new form state.
 * @see specs/004-catalog-promos-reviews/spec.md US5 scenario 4
 */
export async function updateReview(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const values = readReviewForm(formData);
  const invalid = invalidState(values);
  if (invalid !== null) {
    return invalid;
  }
  const body = ReviewUpdateBodySchema.safeParse({
    reviewUuid: readText(formData, ReviewField.REVIEW_UUID),
    rating: values.rating,
    comment: values.comment,
  });
  if (!body.success) {
    return errorState(values, { formError: REVIEW_FORM_MESSAGES.errors.form });
  }
  try {
    await editReview(body.data, await getAccessTokenOrThrow());
  } catch (error) {
    return errorState(values, toReviewFailure(error));
  }
  refreshReviewPages(readText(formData, ReviewField.PRODUCT_UUID), null);
  return { status: ReviewFormStatus.SUCCESS, ...values, fieldErrors: {} };
}

/**
 * Deletes a review of the caller after the confirmation (`DELETE /review/delete/{uuid}`); a
 * review already gone counts as deleted. Its product becomes reviewable again.
 *
 * @param input - Review and product UUIDs.
 * @returns Success, or the reason of the failure.
 */
export async function deleteReview(input: ReviewDeleteInput): Promise<ReviewDeleteState> {
  const parsed = ReviewDeleteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: ReviewFormStatus.ERROR, formError: REVIEW_FORM_MESSAGES.errors.form };
  }
  try {
    await removeReview(parsed.data.reviewUuid, await getAccessTokenOrThrow());
  } catch (error) {
    return { status: ReviewFormStatus.ERROR, ...toReviewFailure(error) };
  }
  refreshReviewPages(parsed.data.productUuid, null);
  return { status: ReviewFormStatus.SUCCESS };
}
