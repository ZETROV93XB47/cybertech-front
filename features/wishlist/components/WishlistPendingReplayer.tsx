"use client";

/**
 * Adds, once, the product a visitor wanted to keep before signing in (FR-038).
 *
 * Mounted once in the root layout next to `GuestCartMerger`; renders nothing. The stored add is
 * removed before it is sent, so a reload never replays it twice.
 *
 * @see specs/003-account-orders/research.md R22
 */
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { clientLogger } from "@/lib/client-logger";

import { sendWishlistChange, setWishlistMembership } from "../hooks/useWishlist";
import { WISHLIST_MESSAGES } from "../messages";
import { takeWishlistPending } from "../wishlist-pending";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/**
 * Invisible component replaying the wishlist add kept aside before the sign-in.
 *
 * @returns Nothing.
 */
export function WishlistPendingReplayer(): null {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const usable = status === AUTHENTICATED_STATUS && !session.error;

  useEffect(() => {
    if (!usable || started.current) {
      return;
    }
    started.current = true;
    const pending = takeWishlistPending(window.sessionStorage);
    if (pending === null) {
      return;
    }
    sendWishlistChange(pending.productUuid, true)
      .then(() => {
        setWishlistMembership(queryClient, pending.productUuid, true);
        toast.success(WISHLIST_MESSAGES.pendingReplayed);
      })
      .catch((error: unknown) => {
        clientLogger.warn("Pending wishlist add failed", {
          reason: error instanceof Error ? error.name : "unknown",
        });
        toast.error(WISHLIST_MESSAGES.pendingFailed);
      });
  }, [usable, queryClient]);

  return null;
}
