"use client";

/**
 * Account slot of the header: « Se connecter » for a visitor, the user's name and
 * « Se déconnecter » once signed in.
 *
 * Sign-out first empties every client cache (account cart, availability…) and the browser cart
 * keys, then runs the Server Action that closes the Keycloak session, so neither the account
 * cart nor the name can be shown again (FR-017, FR-027). A page restored from the back/forward
 * cache after sign-out is reloaded, so the server renders it again without the session.
 */
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { clearGuestCart } from "@/features/cart/guest-storage";
import { clearPendingAction } from "@/features/cart/pending-action";
import { loginPath } from "@/lib/auth/callback-url";
import { REGISTER_PATH } from "@/lib/constants/routes";
import { resetClientState } from "@/lib/query/query-client";

import { signOutEverywhere } from "../actions";
import { AUTH_MESSAGES, REGISTER_MESSAGES } from "../messages";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/** Shared style of the header actions. */
const ACTION =
  "inline-flex h-10 items-center gap-2 rounded-button px-3 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:text-text disabled:opacity-50";

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
 * @returns The sign-in link, or the name and the sign-out button.
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
          <UserRound aria-hidden className="size-4" />
          {AUTH_MESSAGES.signIn}
        </Link>
      </div>
    );
  }
  const name = session.user?.name ?? session.user?.email ?? "";
  const onSignOut = (): void => {
    setSigningOut(true);
    resetClientState(queryClient);
    clearGuestCart(window.localStorage);
    clearPendingAction(window.sessionStorage);
  };
  return (
    <form action={signOutEverywhere} onSubmit={onSignOut} className="flex items-center gap-1">
      <span className="hidden text-sm text-text lg:inline" data-testid="account-name">
        {name}
      </span>
      <button type="submit" disabled={signingOut} className={ACTION}>
        <LogOut aria-hidden className="size-4" />
        {signingOut ? AUTH_MESSAGES.signingOut : AUTH_MESSAGES.signOut}
      </button>
    </form>
  );
}
