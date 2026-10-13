/**
 * « Aller au contenu » link, first focusable element of every page (WCAG 2.4.1).
 */
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";

/** Id of the main landmark targeted by the skip link. */
export const MAIN_CONTENT_ID = "contenu";

/**
 * Visually hidden until focused with the keyboard.
 *
 * @returns The skip link.
 */
export function SkipLink(): ReactNode {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-button focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-text"
    >
      {SITE_MESSAGES.skipToContent}
    </a>
  );
}
