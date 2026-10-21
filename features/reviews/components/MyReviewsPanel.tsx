"use client";

/**
 * Body of « Mes avis »: « À noter » then « Mes avis publiés », one polite live region announcing
 * every publication, update and deletion (FR-022), and an illustrated empty state when there is
 * nothing to review nor any review (FR-015). After a deletion the focus goes to the published
 * reviews heading, since the deleted row is gone.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5
 */
import { MessageSquareHeart } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { CATALOG_PATH } from "@/lib/constants/routes";

import { MY_REVIEWS_MESSAGES } from "../messages";
import type { MyReviewsView } from "../my-reviews-view";

import { MyReviewList } from "./MyReviewList";
import { ReviewableList } from "./ReviewableList";

/** Id of the « À noter » heading. */
const TO_REVIEW_TITLE_ID = "to-review-title";

/** Id of the « Mes avis publiés » heading. */
const PUBLISHED_TITLE_ID = "published-reviews-title";

/** Props of {@link MyReviewsPanel}. */
export interface MyReviewsPanelProps {
  readonly view: MyReviewsView;
  /** Row to open with its form (`{productUuid}:{orderUuid}`), `null` for none. */
  readonly initialOpenId: string | null;
}

/**
 * « Mes avis ».
 *
 * @param props - The view and the row to open.
 * @returns The two sections and the live region, or the empty state.
 */
export function MyReviewsPanel({ view, initialOpenId }: MyReviewsPanelProps): ReactNode {
  const [announcement, setAnnouncement] = useState("");
  const publishedTitle = useRef<HTMLDivElement | null>(null);
  const announce = useCallback((message: string): void => {
    setAnnouncement(message);
  }, []);
  const announceAndFocus = useCallback((message: string): void => {
    setAnnouncement(message);
    publishedTitle.current?.focus();
  }, []);
  const isEmpty = view.toReview.length === 0 && view.published.length === 0;
  return (
    <div className="flex flex-col gap-10">
      <p role="status" aria-live="polite" className="text-sm text-success empty:hidden">
        {announcement}
      </p>
      {isEmpty && (
        <EmptyState
          icon={<MessageSquareHeart className="size-10" />}
          title={MY_REVIEWS_MESSAGES.emptyTitle}
          body={MY_REVIEWS_MESSAGES.emptyBody}
          action={{ href: CATALOG_PATH, label: MY_REVIEWS_MESSAGES.goToCatalog }}
        />
      )}
      {view.toReview.length > 0 && (
        <section aria-labelledby={TO_REVIEW_TITLE_ID} className="flex flex-col gap-4">
          <SectionHeading id={TO_REVIEW_TITLE_ID}>
            {MY_REVIEWS_MESSAGES.toReviewTitle}
          </SectionHeading>
          <ReviewableList
            rows={view.toReview}
            initialOpenId={initialOpenId}
            onAnnounce={announce}
          />
        </section>
      )}
      {view.published.length > 0 && (
        <section aria-labelledby={PUBLISHED_TITLE_ID} className="flex flex-col gap-4">
          <div ref={publishedTitle} tabIndex={-1} className="focus:outline-none">
            <SectionHeading id={PUBLISHED_TITLE_ID}>
              {MY_REVIEWS_MESSAGES.publishedTitle}
            </SectionHeading>
          </div>
          <MyReviewList
            rows={view.published}
            page={view.page}
            totalPages={view.totalPages}
            onAnnounce={announceAndFocus}
          />
        </section>
      )}
    </div>
  );
}
