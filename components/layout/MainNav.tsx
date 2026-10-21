"use client";

/**
 * Main navigation links: Accueil, Catalogue (FR-025). Feature 004 groups the categories under
 * the « Catalogue » menu (US2) and adds « Promotions » (US4).
 *
 * The current section carries `aria-current="page"` and a gold underline, so it is never
 * conveyed by colour alone (FR-026). At full effects the underline slides from one link to the
 * next (shared layout animation); otherwise it simply moves (R14). Every link has the same hover and focus states. The static
 * version (no current link) is the `Suspense` fallback required by `useSearchParams`.
 *
 * @see specs/002-catalog-refresh/research.md R12
 */
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { NavSection } from "@/lib/enums/nav-section";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

import { resolveNavSection } from "./nav-section";

/** Shared layout id of the underline, so it slides between links. */
const UNDERLINE_LAYOUT_ID = "main-nav-underline";

/** One link of the bar. */
interface NavLink {
  readonly section: NavSection;
  readonly href: string;
  readonly label: string;
}

/** Links of the bar, in display order. */
const NAV_LINKS: readonly NavLink[] = [
  { section: NavSection.HOME, href: HOME_PATH, label: SITE_MESSAGES.homeNavLink },
  { section: NavSection.CATALOG, href: CATALOG_PATH, label: SITE_MESSAGES.catalogLink },
];

/**
 * Gold underline of the current link.
 *
 * @returns The indicator, sliding between links at full effects.
 */
function Underline(): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  return (
    <motion.span
      aria-hidden
      data-nav-indicator
      data-entrance={mode}
      {...(mode === EntranceMode.MOVE ? { layoutId: UNDERLINE_LAYOUT_ID } : {})}
      transition={tokens.base}
      className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gold"
    />
  );
}

/**
 * The navigation landmark with its links.
 *
 * @param props - Section to mark as current, `NONE` for none.
 * @returns The navigation.
 */
function NavLinks({ current }: { readonly current: NavSection }): ReactNode {
  return (
    <nav aria-label={SITE_MESSAGES.mainNavigation} className="flex-1">
      <ul className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const isCurrent = link.section === current;
          return (
            <li key={link.section}>
              <Link
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center rounded-button px-3 text-sm transition-colors duration-(--duration-fast) hover:text-text",
                  isCurrent ? "text-text" : "text-text-muted",
                )}
              >
                {link.label}
                {isCurrent && <Underline />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Links without current section, rendered before the address is known on the client.
 *
 * @returns The navigation.
 */
export function StaticMainNav(): ReactNode {
  return <NavLinks current={NavSection.NONE} />;
}

/**
 * Links with the current section of the page.
 *
 * @returns The navigation.
 */
export function MainNav(): ReactNode {
  const pathname = usePathname();
  return <NavLinks current={resolveNavSection(pathname)} />;
}
