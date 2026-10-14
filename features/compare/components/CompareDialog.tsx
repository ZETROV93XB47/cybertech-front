"use client";

/**
 * « Comparer » button and the large comparison modal it opens over the current page.
 *
 * Radix keeps the focus inside the modal, closes it with Escape or the close button and gives
 * the focus back to « Comparer » (FR-017). The view is loaded only while the modal is open. The
 * modal fades and scales in at full effects, and only fades otherwise (`data-entrance`, see
 * `styles/globals.css`, R14); its duration is the base duration of the motion tokens.
 *
 * @see specs/002-catalog-refresh/research.md R11
 * @see specs/002-catalog-refresh/spec.md FR-017 to FR-019
 */
import type { UseQueryResult } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { COMPARE_MAX_PRODUCTS } from "@/lib/constants/compare";
import type { ComparisonView } from "@/lib/schemas/compare";
import { useSurfaceMotion } from "@/styles/motion";

import { useComparison } from "../hooks/useComparison";
import { COMPARE_BAR_MESSAGES, COMPARE_DIALOG_MESSAGES } from "../messages";

import { CompareTable } from "./CompareTable";

/** Number of skeleton rows shown while the view loads. */
const SKELETON_ROWS = 6;

/** Props of {@link CompareDialog}. */
export interface CompareDialogProps {
  /** Selected product UUIDs, in insertion order. */
  readonly uuids: readonly string[];
}

/**
 * Placeholder of the table while the view loads.
 *
 * @returns The skeleton, announced as loading.
 */
function CompareSkeleton(): ReactNode {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{COMPARE_DIALOG_MESSAGES.loading}</span>
      <div aria-hidden className="grid grid-cols-4 gap-4">
        {Array.from({ length: COMPARE_MAX_PRODUCTS + 1 }, (_, index) => (
          <div key={index} className="skeleton-shimmer aspect-4/3 rounded-field" />
        ))}
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} aria-hidden className="skeleton-shimmer h-6 rounded-field" />
      ))}
    </div>
  );
}

/**
 * Content of the modal for each query state.
 *
 * @param props - Query and filter.
 * @returns Skeleton, error with retry, or the table.
 */
function CompareBody({
  query,
  differencesOnly,
}: {
  readonly query: UseQueryResult<ComparisonView>;
  readonly differencesOnly: boolean;
}): ReactNode {
  if (query.isPending) {
    return <CompareSkeleton />;
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-6 text-sm">
        <p className="text-text-muted">{COMPARE_DIALOG_MESSAGES.error}</p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          {COMMON_MESSAGES.retry}
        </Button>
      </div>
    );
  }
  return <CompareTable view={query.data} differencesOnly={differencesOnly} />;
}

/**
 * « Comparer » trigger and its modal.
 *
 * @param props - Selected products.
 * @returns The trigger and the modal.
 */
export function CompareDialog({ uuids }: CompareDialogProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const switchId = useId();
  const query = useComparison(uuids, open);
  const { mode } = useSurfaceMotion();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" aria-busy={query.isFetching} className="cta-gradient rounded-button">
          {query.isFetching && <LoaderCircle aria-hidden className="animate-spin" />}
          {COMPARE_BAR_MESSAGES.compare}
        </Button>
      </DialogTrigger>
      <DialogContent
        data-entrance={mode}
        className="glass flex max-h-11/12 flex-col gap-8 overflow-hidden rounded-card p-8 duration-(--duration-base) sm:max-w-catalog"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">{COMPARE_DIALOG_MESSAGES.title}</DialogTitle>
          <DialogDescription>{COMPARE_DIALOG_MESSAGES.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 text-sm">
          <Switch id={switchId} checked={differencesOnly} onCheckedChange={setDifferencesOnly} />
          <label htmlFor={switchId}>{COMPARE_DIALOG_MESSAGES.differencesOnly}</label>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <CompareBody query={query} differencesOnly={differencesOnly} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
