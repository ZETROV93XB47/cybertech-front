/**
 * Site footer: the full cybertech logo, then a single sober line, so the page ends quietly.
 */
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";

import { BrandLogo, BrandLogoVariant } from "./BrandLogo";

/**
 * Footer landmark.
 *
 * @returns The footer.
 */
export function Footer(): ReactNode {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-site flex-col items-start gap-4 px-6 py-8 text-sm text-text-muted">
        <BrandLogo variant={BrandLogoVariant.LOCKUP} />
        <p>{SITE_MESSAGES.footerNote}</p>
      </div>
    </footer>
  );
}
