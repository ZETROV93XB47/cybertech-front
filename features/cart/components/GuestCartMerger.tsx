"use client";

/**
 * Merges the guest cart into the account cart once the session becomes authenticated.
 *
 * Mounted once in the root layout; renders nothing. No code runs in the Auth.js callbacks: the
 * merge needs the browser storage, so it is triggered here (docs/guest-cart.md §4 rule 1).
 */
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { clientLogger } from "@/lib/client-logger";

import { accountCartQueryKey } from "../hooks/useCart";
import { readGuestCart } from "../guest-storage";
import { mergeGuestCartOnce, summarizeMerge } from "../merge-client";
import { MERGE_MESSAGES } from "../messages";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/**
 * Shows the toasts of a merge report.
 *
 * @param summary - Toast lines.
 */
function showSummary(summary: ReturnType<typeof summarizeMerge>): void {
  if (summary.success) {
    toast.success(summary.success);
  }
  summary.warnings.forEach((warning) => {
    toast.warning(warning);
  });
}

/**
 * Invisible component running the guest cart merge after sign-in.
 *
 * @returns Nothing.
 */
export function GuestCartMerger(): null {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const usable = status === AUTHENTICATED_STATUS && !session.error;

  useEffect(() => {
    if (!usable || started.current || readGuestCart(window.localStorage).length === 0) {
      return;
    }
    started.current = true;
    mergeGuestCartOnce(window.localStorage)
      .then((report) => {
        if (!report) {
          return;
        }
        queryClient.setQueryData(accountCartQueryKey(), report.cart);
        showSummary(summarizeMerge(report));
      })
      .catch((error: unknown) => {
        clientLogger.warn("Guest cart merge failed; kept for the next visit", {
          reason: error instanceof Error ? error.name : "unknown",
        });
        toast.warning(MERGE_MESSAGES.retryLater);
      });
  }, [usable, queryClient]);

  return null;
}
