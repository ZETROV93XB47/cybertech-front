/**
 * What the browser does when an account action meets a session that can no longer be renewed:
 * keep the action aside, then go to the sign-in page, which brings the user back here.
 *
 * @see specs/001-catalog-auth-cart/research.md R14
 * @see specs/001-catalog-auth-cart/spec.md FR-018
 */
import { toPendingAction, storePendingAction } from "@/features/cart/pending-action";
import type { CartViewChange } from "@/features/cart/cart-view";
import { loginPath } from "@/lib/auth/callback-url";

/**
 * Path of the current page, with its query string and hash.
 *
 * @returns The path to come back to after sign-in.
 */
export function currentPath(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

/**
 * Stores the failed cart change and sends the user to the sign-in page.
 *
 * @param change - Cart change refused for lack of a valid session.
 */
export function handleExpiredSession(change: CartViewChange): void {
  const action = toPendingAction(change);
  if (action) {
    storePendingAction(window.sessionStorage, action);
  }
  window.location.assign(loginPath(currentPath()));
}
