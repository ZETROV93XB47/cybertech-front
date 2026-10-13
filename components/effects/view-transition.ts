/**
 * Shared-element transition between a product card and its page (spec annex « Transition
 * partagée carte produit → page détail »), with the View Transitions API.
 *
 * The App Router navigates on the client, so the transition must wait until the new page is on
 * screen: `startViewTransition` receives a promise resolved by {@link resolvePendingTransition},
 * called when the path changes (see `ViewTransitionResolver`).
 */

/**
 * Longest wait for the new page: past it, the transition ends anyway (slow network). Not a
 * visual value: a safety limit so the page never stays frozen.
 */
const NAVIGATION_TIMEOUT_MS = 3_000;

/** Resolver of the transition waiting for the next page, if any. */
let pending: (() => void) | null = null;

/**
 * Tells whether the browser supports view transitions.
 *
 * @returns `true` when `document.startViewTransition` exists.
 */
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/**
 * Ends the transition waiting for a page, once that page is rendered.
 */
export function resolvePendingTransition(): void {
  pending?.();
  pending = null;
}

/**
 * Navigates inside a view transition.
 *
 * @param navigate - Starts the client-side navigation (e.g. `router.push`).
 */
export function navigateWithTransition(navigate: () => void): void {
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pending = resolve;
        navigate();
        setTimeout(resolvePendingTransition, NAVIGATION_TIMEOUT_MS);
      }),
  );
}
