/**
 * Site footer: a single sober line, so the page ends quietly.
 */
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";

/**
 * Footer landmark.
 *
 * @returns The footer.
 */
export function Footer(): ReactNode {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-site px-6 py-8 text-sm text-text-muted">
        {SITE_MESSAGES.footerNote}
      </div>
    </footer>
  );
}
