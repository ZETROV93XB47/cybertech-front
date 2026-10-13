/**
 * Controllable `window.matchMedia` for jsdom (which does not implement it).
 */
import { vi } from "vitest";

/** Handle to change the simulated system « reduce motion » setting. */
export interface MatchMediaControl {
  setReducedMotion(value: boolean): void;
}

/**
 * Installs a fake `matchMedia` whose `prefers-reduced-motion` answer can be changed.
 *
 * @param initialReducedMotion - Initial system setting.
 * @returns A handle to change the setting and notify listeners.
 */
export function installMatchMedia(initialReducedMotion = false): MatchMediaControl {
  let reduced = initialReducedMotion;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return query.includes("prefers-reduced-motion") && reduced;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return {
    setReducedMotion(value: boolean) {
      reduced = value;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}
