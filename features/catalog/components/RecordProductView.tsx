"use client";

/**
 * Records the product page view in the recently viewed list. Renders nothing.
 */
import { useEffect, type ReactNode } from "react";

import { clientLogger } from "@/lib/client-logger";

import { recordRecentlyViewed, RECENTLY_VIEWED_EVENT } from "../recently-viewed";

/** Props of {@link RecordProductView}. */
export interface RecordProductViewProps {
  readonly productUuid: string;
}

/**
 * Stores the view once the page is shown.
 *
 * @param props - Viewed product.
 * @returns Nothing visible.
 */
export function RecordProductView({ productUuid }: RecordProductViewProps): ReactNode {
  useEffect(() => {
    try {
      recordRecentlyViewed(window.localStorage, productUuid);
      window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
    } catch (error) {
      // Storage can be blocked (private mode, quota): the history is a convenience, not a must.
      clientLogger.warn("Recently viewed products not saved", {
        reason: error instanceof Error ? error.name : "unknown",
      });
    }
  }, [productUuid]);
  return null;
}
