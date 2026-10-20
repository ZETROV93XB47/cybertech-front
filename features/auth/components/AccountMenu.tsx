"use client";

/**
 * Account slot of the header: « Créer un compte » and « Se connecter » for a visitor; once
 * signed in, the avatar menu (`AccountAvatarMenu`): initials, and on hover or click a panel with
 * the user's name, the account sections and « Se déconnecter » (FR-040).
 *
 * Sign-out first empties every client cache (account cart, availability…) and the browser cart
 * keys, then runs the Server Action that closes the Keycloak session, so neither the account
 * cart nor the name can be shown again (FR-017, FR-027). A page restored from the back/forward
 * cache after sign-out is reloaded, so the server renders it again without the session.
 */
import { useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { HEADER_CONTROL_CLASS, HEADER_ICON_CLASS } from "@/components/layout/header-controls";
import { clearGuestCart } from "@/features/cart/guest-storage";
import { clearPendingAction } from "@/features/cart/pending-action";
import { clearWishlistPending } from "@/features/wishlist/wishlist-pending";
import { loginPath } from "@/lib/auth/callback-url";
import { REGISTER_PATH } from "@/lib/constants/routes";
import { resetClientState } from "@/lib/query/query-client";

import { toAccountIdentity } from "../account-identity";
import { AUTH_MESSAGES, REGISTER_MESSAGES } from "../messages";

import { AccountAvatarMenu } from "./AccountAvatarMenu";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/** Shared style of the header actions. */
const ACTION = `${HEADER_CONTROL_CLASS} disabled:opacity-50`;

/**
 * Reloads a page restored from the back/forward cache, so private content rendered before a
 * sign-out is never shown again from memory.
 *
 * @param enabled - Whether the current page shows private content.
 */
function useReloadOnBackForwardRestore(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [enabled]);
}

/**
 * Header account menu.
 *
 * @returns The sign-in links, or the avatar menu.
 */
export function AccountMenu(): ReactNode {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const signedIn = status === AUTHENTICATED_STATUS && !session.error;
  useReloadOnBackForwardRestore(signedIn);

  if (status === LOADING_STATUS) {
    return <span aria-hidden className="inline-block h-10 w-28" />;
  }
  if (!signedIn) {
    return (
      <div className="flex items-center gap-1">
        <Link href={REGISTER_PATH} className={ACTION}>
          {REGISTER_MESSAGES.headerLink}
        </Link>
        <Link href={loginPath(pathname)} className={ACTION}>
          <UserRound aria-hidden className={HEADER_ICON_CLASS} />
          {AUTH_MESSAGES.signIn}
        </Link>
      </div>
    );
  }
  const onSignOut = (): void => {
    setSigningOut(true);
    resetClientState(queryClient);
    clearGuestCart(window.localStorage);
    clearPendingAction(window.sessionStorage);
    clearWishlistPending(window.sessionStorage);
  };
  return (
    <AccountAvatarMenu
      identity={toAccountIdentity(session.user)}
      signingOut={signingOut}
      onSignOut={onSignOut}
    />
  );
}
