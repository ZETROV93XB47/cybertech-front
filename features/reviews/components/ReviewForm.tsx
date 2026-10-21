"use client";

/**
 * Review form, to publish (`createReview`) or edit (`updateReview`) a review: star rating, optional
 * comment with a « N / 1 000 » counter, and the outcome in a polite live region (FR-016 to FR-018,
 * FR-022).
 *
 * The typed rating and comment come back with every error, so a comment refused by the moderation
 * can be reworded without retyping (FR-017). An expired session invites to sign in again and never
 * resends by itself. A product no longer reviewable, or a review gone meanwhile, refreshes the lists.
 *
 * The form opens from a button, so it always runs with JavaScript: the Server Action is called by
 * hand in a transition rather than through `<form action>`, which React resets once the action ends
 * (clearing the stars), and whose result would arrive in the same render that removes a published
 * product from « À noter ». The parent is told of the success straight from the answer.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode, type SubmitEvent } from "react";

import { buttonVariants } from "@/components/ui/button";
import { loginPath } from "@/lib/auth/callback-url";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants/reviews";
import { ReviewField, ReviewFormMode, ReviewFormStatus } from "@/lib/enums/review";
import { cn } from "@/lib/utils";

import { createReview, updateReview } from "../actions";
import { REVIEW_FORM_MESSAGES } from "../messages";
import { initialReviewState, type ReviewFormValues } from "../review-state";

import { StarRatingInput } from "./StarRatingInput";

/** Hidden identifiers sent with the form. */
export type ReviewFormTarget =
  | {
      readonly mode: ReviewFormMode.CREATE;
      readonly orderUuid: string;
      readonly productUuid: string;
    }
  | {
      readonly mode: ReviewFormMode.EDIT;
      readonly reviewUuid: string;
      readonly productUuid: string;
    };

/** Props of {@link ReviewForm}. */
export interface ReviewFormProps {
  readonly target: ReviewFormTarget;
  /** Rating and comment to start from. */
  readonly initial: ReviewFormValues;
  /** Called once the review is written, with the message to announce. */
  readonly onSuccess: (message: string) => void;
  /** Closes the form without writing anything. */
  readonly onCancel: () => void;
  /** Accessible name of the form (« Donner ton avis sur … »). */
  readonly label: string;
}

/**
 * Hidden identifiers of the target.
 *
 * @param props - The target.
 * @returns The hidden inputs.
 */
function TargetFields({ target }: { readonly target: ReviewFormTarget }): ReactNode {
  return (
    <>
      <input type="hidden" name={ReviewField.PRODUCT_UUID} value={target.productUuid} />
      {target.mode === ReviewFormMode.CREATE ? (
        <input type="hidden" name={ReviewField.ORDER_UUID} value={target.orderUuid} />
      ) : (
        <input type="hidden" name={ReviewField.REVIEW_UUID} value={target.reviewUuid} />
      )}
    </>
  );
}

/**
 * Comment with its counter.
 *
 * @param props - Initial comment and error.
 * @returns The labelled textarea.
 */
function CommentField({
  defaultValue,
  error,
}: {
  readonly defaultValue: string;
  readonly error: string | undefined;
}): ReactNode {
  const [length, setLength] = useState(defaultValue.length);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {REVIEW_FORM_MESSAGES.commentLabel}
      </label>
      <p id={`${id}-hint`} className="text-xs text-text-muted">
        {REVIEW_FORM_MESSAGES.commentHint}
      </p>
      <textarea
        id={id}
        name={ReviewField.COMMENT}
        defaultValue={defaultValue}
        maxLength={REVIEW_COMMENT_MAX_LENGTH}
        rows={4}
        aria-describedby={`${id}-hint ${id}-count`}
        aria-invalid={error === undefined ? undefined : true}
        onChange={(event) => {
          setLength(event.target.value.length);
        }}
        className="rounded-field border border-border bg-surface-2 p-3 text-sm text-text"
      />
      <p id={`${id}-count`} className="self-end font-mono text-xs text-text-muted">
        {REVIEW_FORM_MESSAGES.counter(length)}
      </p>
      {error !== undefined && <p className="text-sm text-rose">{error}</p>}
    </div>
  );
}

/**
 * Review form.
 *
 * @param props - Target, initial values, callbacks and name.
 * @returns The form.
 */
export function ReviewForm({
  target,
  initial,
  onSuccess,
  onCancel,
  label,
}: ReviewFormProps): ReactNode {
  const isCreate = target.mode === ReviewFormMode.CREATE;
  const [state, setState] = useState(() => initialReviewState(initial));
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const next = await (isCreate ? createReview : updateReview)(state, data);
      setState(next);
      if (next.status === ReviewFormStatus.SUCCESS) {
        onSuccess(isCreate ? REVIEW_FORM_MESSAGES.published : REVIEW_FORM_MESSAGES.updated);
      } else if (next.isStale === true) {
        router.refresh();
      }
    });
  };
  return (
    <form onSubmit={onSubmit} aria-label={label} className="flex flex-col gap-4">
      <TargetFields target={target} />
      <StarRatingInput defaultValue={state.rating} error={state.fieldErrors[ReviewField.RATING]} />
      <CommentField defaultValue={state.comment} error={state.fieldErrors[ReviewField.COMMENT]} />
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-rose">
        {state.status === ReviewFormStatus.ERROR && state.formError}{" "}
        {state.needsSignIn === true && (
          <Link href={loginPath(pathname)} className="text-brand-text underline underline-offset-4">
            {REVIEW_FORM_MESSAGES.errors.signIn}
          </Link>
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={cn(buttonVariants(), "cta-gradient")}
        >
          {submitLabel(isCreate, pending)}
        </button>
        <button type="button" onClick={onCancel} className={buttonVariants({ variant: "ghost" })}>
          {REVIEW_FORM_MESSAGES.cancel}
        </button>
      </div>
    </form>
  );
}

/**
 * Label of the submit button.
 *
 * @param isCreate - Publishing (not editing).
 * @param pending - The submission is running.
 * @returns The label.
 */
function submitLabel(isCreate: boolean, pending: boolean): string {
  if (isCreate) {
    return pending ? REVIEW_FORM_MESSAGES.publishing : REVIEW_FORM_MESSAGES.publish;
  }
  return pending ? REVIEW_FORM_MESSAGES.updating : REVIEW_FORM_MESSAGES.update;
}
