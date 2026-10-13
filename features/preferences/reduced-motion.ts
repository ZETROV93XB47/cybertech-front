/**
 * Subscription to the system « reduce motion » setting, for `useSyncExternalStore`.
 */

/** Media query matching the system request for less motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Subscribes to changes of the system setting.
 *
 * @param onChange - Called when the setting changes.
 * @returns The unsubscribe function.
 */
export function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/**
 * Reads the system setting in the browser.
 *
 * @returns `true` when the system asks for reduced motion.
 */
export function readReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Server value of the setting: unknown on the server, so effects start as preferred and the
 * client corrects it at hydration (effects are client-only and mounted after hydration anyway).
 *
 * @returns Always `false`.
 */
export function readReducedMotionOnServer(): boolean {
  return false;
}
