"use client";

/**
 * Runs, once per sign-in, what must happen when the session becomes authenticated:
 * 1. merge the guest cart into the account cart (docs/guest-cart.md §4);
 * 2. then replay the cart action kept aside when the previous session expired (research R14).
 *
 * Mounted once in the root layout; renders nothing. No code runs in the Auth.js callbacks: both
 * steps need the browser storage.
 */
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { BffError } from "@/lib/api/bff-client";
import { clientLogger } from "@/lib/client-logger";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { sendAccountChange } from "../cart-client";
import { cartErrorMessage, cartSuccessMessage } from "../cart-feedback";
import { readGuestCart } from "../guest-storage";
import { accountCartQueryKey } from "../hooks/useCart";
import { mergeGuestCartOnce, summarizeMerge, type MergeSummary } from "../merge-client";
import { MERGE_MESSAGES } from "../messages";
import { takePendingAction, toCartChange } from "../pending-action";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/**
 * Shows the toasts of a merge report.
 *
 * @param summary - Toast lines.
 */
function showSummary(summary: MergeSummary): void {
  if (summary.success) {
    toast.success(summary.success);
  }
  summary.warnings.forEach((warning) => {
    toast.warning(warning);
  });
}

/**
 * Merges the guest cart, when there is one.
 *
 * @param queryClient - Query client, updated with the merged account cart.
 * @returns A promise resolved once the merge is over (failures are reported, never thrown).
 */
async function mergeIfNeeded(queryClient: QueryClient): Promise<void> {
  if (readGuestCart(window.localStorage).length === 0) {
    return;
  }
  try {
    const report = await mergeGuestCartOnce(window.localStorage);
    if (report) {
      queryClient.setQueryData(accountCartQueryKey(), report.cart);
      showSummary(summarizeMerge(report));
    }
  } catch (error) {
    clientLogger.warn("Guest cart merge failed; kept for the next visit", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    toast.warning(MERGE_MESSAGES.retryLater);
  }
}

/**
 * Replays, once, the cart action kept aside before the sign-in.
 *
 * @param queryClient - Query client, updated with the resulting account cart.
 * @returns A promise resolved once the action is replayed (failures are reported, never thrown).
 */
async function replayPendingAction(queryClient: QueryClient): Promise<void> {
  const action = takePendingAction(window.sessionStorage);
  const change = action ? toCartChange(action) : null;
  if (!change) {
    return;
  }
  try {
    const cart = await sendAccountChange(change);
    queryClient.setQueryData(accountCartQueryKey(), cart);
    toast.success(MERGE_MESSAGES.pendingReplayed(cartSuccessMessage(change, undefined, cart)));
  } catch (error) {
    const code = error instanceof BffError ? error.code : FrontErrorCode.UNKNOWN;
    toast.error(
      cartErrorMessage(code, error instanceof BffError ? error.availableStock : undefined),
    );
  }
}

/**
 * Invisible component running the post-sign-in cart steps.
 *
 * @returns Nothing.
 */
export function GuestCartMerger(): null {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const usable = status === AUTHENTICATED_STATUS && !session.error;

  useEffect(() => {
    if (!usable || started.current) {
      return;
    }
    started.current = true;
    void mergeIfNeeded(queryClient).then(() => replayPendingAction(queryClient));
  }, [usable, queryClient]);

  return null;
}
