"use client";

/**
 * « À noter » of « Mes avis »: each product the customer can review, with its order date and
 * « Donner mon avis », which opens the review form in place (FR-015). The row named in the address
 * (`?product=&order=`, link of the order detail, FR-019) opens with its form.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5 scenarios 1 and 2
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ReviewFormMode } from "@/lib/enums/review";
import { cn } from "@/lib/utils";

import { MY_REVIEWS_MESSAGES } from "../messages";
import type { ToReviewRow } from "../my-reviews-view";

import { ReviewForm } from "./ReviewForm";

/** Rating and comment of a new review. */
const EMPTY_REVIEW = { rating: null, comment: "" } as const;

/** Props of {@link ReviewableList}. */
export interface ReviewableListProps {
  readonly rows: readonly ToReviewRow[];
  /** Row to open with its form (`{productUuid}:{orderUuid}`), `null` for none. */
  readonly initialOpenId: string | null;
  /** Announces a published review. */
  readonly onAnnounce: (message: string) => void;
}

/**
 * One product to review.
 *
 * @param props - Row, open state and callbacks.
 * @returns The list item.
 */
function ToReviewItem({
  row,
  isOpen,
  onToggle,
  onAnnounce,
}: {
  readonly row: ToReviewRow;
  readonly isOpen: boolean;
  readonly onToggle: (open: boolean) => void;
  readonly onAnnounce: (message: string) => void;
}): ReactNode {
  return (
    <li className="glass flex flex-col gap-4 rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href={row.productHref} className="font-medium text-text hover:text-brand-text">
            {row.productName}
          </Link>
          {row.orderedOn !== null && (
            <span className="text-sm text-text-muted">
              {MY_REVIEWS_MESSAGES.orderedOn(row.orderedOn)}
            </span>
          )}
        </div>
        {!isOpen && (
          <button
            type="button"
            aria-label={MY_REVIEWS_MESSAGES.reviewLabel(row.productName)}
            onClick={() => {
              onToggle(true);
            }}
            className={cn(buttonVariants(), "cta-gradient")}
          >
            {MY_REVIEWS_MESSAGES.review}
          </button>
        )}
      </div>
      {isOpen && (
        <ReviewForm
          target={{
            mode: ReviewFormMode.CREATE,
            orderUuid: row.orderUuid,
            productUuid: row.productUuid,
          }}
          initial={EMPTY_REVIEW}
          label={MY_REVIEWS_MESSAGES.reviewLabel(row.productName)}
          onSuccess={onAnnounce}
          onCancel={() => {
            onToggle(false);
          }}
        />
      )}
    </li>
  );
}

/**
 * Products to review.
 *
 * @param props - Rows, row to open and announcer.
 * @returns The list, or nothing when there is no product to review.
 */
export function ReviewableList({
  rows,
  initialOpenId,
  onAnnounce,
}: ReviewableListProps): ReactNode {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  if (rows.length === 0) {
    return null;
  }
  return (
    <ul aria-label={MY_REVIEWS_MESSAGES.toReviewLabel} className="flex flex-col gap-4">
      {rows.map((row) => (
        <ToReviewItem
          key={row.id}
          row={row}
          isOpen={openId === row.id}
          onToggle={(open) => {
            setOpenId(open ? row.id : null);
          }}
          onAnnounce={onAnnounce}
        />
      ))}
    </ul>
  );
}
