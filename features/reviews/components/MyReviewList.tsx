"use client";

/**
 * « Mes avis publiés »: each review of the customer, newest first (product, stars, comment, date,
 * « modifié le … »), with « Modifier » in place and « Supprimer » after confirmation, then the
 * pages (FR-015, FR-018).
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5 scenarios 4 and 8
 */
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ReviewStars } from "@/features/catalog/components/ReviewItem";
import { ReviewFormMode } from "@/lib/enums/review";

import { MY_REVIEWS_MESSAGES } from "../messages";
import { myReviewsPagePath, type PublishedRow } from "../my-reviews-view";

import { DeleteReviewDialog } from "./DeleteReviewDialog";
import { ReviewForm } from "./ReviewForm";

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/** Props of {@link MyReviewList}. */
export interface MyReviewListProps {
  readonly rows: readonly PublishedRow[];
  /** 1-based page shown. */
  readonly page: number;
  readonly totalPages: number;
  /** Announces an update or a deletion. */
  readonly onAnnounce: (message: string) => void;
}

/**
 * Dates of a review: publication and last edit.
 *
 * @param props - The review.
 * @returns The dates line.
 */
function ReviewDates({ row }: { readonly row: PublishedRow }): ReactNode {
  return (
    <span className="text-sm text-text-muted">
      {row.postedOn !== null && MY_REVIEWS_MESSAGES.postedOn(row.postedOn)}
      {row.editedOn !== null && ` · ${MY_REVIEWS_MESSAGES.editedOn(row.editedOn)}`}
    </span>
  );
}

/**
 * One published review, read-only or being edited.
 *
 * @param props - The review and the announcer.
 * @returns The list item.
 */
function PublishedItem({
  row,
  onAnnounce,
}: {
  readonly row: PublishedRow;
  readonly onAnnounce: (message: string) => void;
}): ReactNode {
  const [isEditing, setEditing] = useState(false);
  return (
    <li className="glass flex flex-col gap-3 rounded-card p-5">
      <div className="flex flex-col gap-1">
        <Link href={row.productHref} className="font-medium text-text hover:text-brand-text">
          {row.productName}
        </Link>
        <ReviewDates row={row} />
      </div>
      {isEditing ? (
        <ReviewForm
          target={{ mode: ReviewFormMode.EDIT, reviewUuid: row.uuid, productUuid: row.productUuid }}
          initial={{ rating: row.rating, comment: row.comment }}
          label={MY_REVIEWS_MESSAGES.editLabel(row.productName)}
          onSuccess={(message) => {
            setEditing(false);
            onAnnounce(message);
          }}
          onCancel={() => {
            setEditing(false);
          }}
        />
      ) : (
        <>
          <ReviewStars rating={row.rating} />
          {row.comment !== "" && (
            <p className="text-sm whitespace-pre-line text-text">{row.comment}</p>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <button
              type="button"
              aria-label={MY_REVIEWS_MESSAGES.editLabel(row.productName)}
              onClick={() => {
                setEditing(true);
              }}
              className={SECONDARY_BUTTON}
            >
              <Pencil aria-hidden className="size-4" />
              {MY_REVIEWS_MESSAGES.edit}
            </button>
            <DeleteReviewDialog
              reviewUuid={row.uuid}
              productUuid={row.productUuid}
              productName={row.productName}
              onDeleted={onAnnounce}
            />
          </div>
        </>
      )}
    </li>
  );
}

/**
 * Previous / next pages of the published reviews.
 *
 * @param props - Current page and total.
 * @returns The navigation, or nothing on a single page.
 */
function ReviewPages({
  page,
  totalPages,
}: {
  readonly page: number;
  readonly totalPages: number;
}): ReactNode {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav aria-label={MY_REVIEWS_MESSAGES.pagination} className="flex items-center gap-4 text-sm">
      {page > 1 && (
        <Link href={myReviewsPagePath(page - 1)} className={SECONDARY_BUTTON}>
          {MY_REVIEWS_MESSAGES.previousPage}
        </Link>
      )}
      <span className="text-text-muted">{MY_REVIEWS_MESSAGES.pageStatus(page, totalPages)}</span>
      {page < totalPages && (
        <Link href={myReviewsPagePath(page + 1)} className={SECONDARY_BUTTON}>
          {MY_REVIEWS_MESSAGES.nextPage}
        </Link>
      )}
    </nav>
  );
}

/**
 * Published reviews.
 *
 * @param props - Rows, pagination and announcer.
 * @returns The list and its pages, or nothing without review.
 */
export function MyReviewList({ rows, page, totalPages, onAnnounce }: MyReviewListProps): ReactNode {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label={MY_REVIEWS_MESSAGES.publishedLabel} className="flex flex-col gap-4">
        {rows.map((row) => (
          <PublishedItem key={row.uuid} row={row} onAnnounce={onAnnounce} />
        ))}
      </ul>
      <ReviewPages page={page} totalPages={totalPages} />
    </div>
  );
}
