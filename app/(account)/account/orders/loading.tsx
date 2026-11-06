/**
 * Loading state of « Mes commandes » (feature 003 T073): while the orders are read on the
 * server, the account shell stays and the list area shows the shared shimmering skeletons, with
 * the same shape as the rows so nothing jumps when they arrive (CLS).
 *
 * @see specs/003-account-orders/tasks.md T073
 */
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { COMMON_MESSAGES } from "@/features/common/messages";

/** Number of placeholder rows, about one screen of orders. */
const PLACEHOLDER_ROWS = 4;

/**
 * Orders loading state.
 *
 * @returns Title and row placeholders, announced as loading.
 */
export default function OrdersLoading(): ReactNode {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {COMMON_MESSAGES.loading}
      </span>
      <Skeleton className="skeleton-shimmer h-12 w-2/3 rounded-field" />
      <Skeleton className="skeleton-shimmer h-6 w-1/2 rounded-field" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
          <Skeleton key={index} className="skeleton-shimmer h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
