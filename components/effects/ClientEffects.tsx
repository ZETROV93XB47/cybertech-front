"use client";

/**
 * Page-wide client effects mounted by the providers:
 * - smooth scrolling with Lenis, only when `THEME.effects[level].smoothScroll.enabled`,
 *   re-evaluated when the preference or the system setting changes;
 * - the end of a pending view transition once the new page is rendered.
 */
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";

import { resolvePendingTransition } from "./view-transition";

/**
 * Starts Lenis while smooth scrolling is enabled.
 *
 * @param enabled - Whether the effective level enables it.
 * @param durationSeconds - Length of one scroll animation.
 */
function useSmoothScroll(enabled: boolean, durationSeconds: number): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const lenis = new Lenis({ duration: durationSeconds, autoRaf: true });
    return () => {
      lenis.destroy();
    };
  }, [enabled, durationSeconds]);
}

/**
 * Invisible component running the page-wide effects.
 *
 * @returns Nothing.
 */
export function ClientEffects(): ReactNode {
  const { smoothScroll } = useEffectiveEffects().settings;
  const pathname = usePathname();
  useSmoothScroll(smoothScroll.enabled, smoothScroll.durationSeconds);
  useEffect(() => {
    resolvePendingTransition();
  }, [pathname]);
  return null;
}
