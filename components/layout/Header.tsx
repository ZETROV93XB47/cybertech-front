/**
 * Site header: wordmark, main navigation and action slots.
 *
 * The slots (search, preferences, account, cart) are filled by the user stories that own them
 * (US1 command palette, US5 preferences, US3 account menu, US4 cart badge), so the header does
 * not depend on any feature.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";

/** Action slots of the header, right-hand side, in reading order. */
export interface HeaderProps {
  readonly search?: ReactNode;
  readonly preferences?: ReactNode;
  readonly account?: ReactNode;
  readonly cart?: ReactNode;
}

/**
 * Sticky glass header.
 *
 * @param props - Optional action slots.
 * @returns The header landmark.
 */
export function Header({ search, preferences, account, cart }: HeaderProps): ReactNode {
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-header w-full max-w-site items-center gap-6 px-6">
        <Link
          href={HOME_PATH}
          aria-label={SITE_MESSAGES.homeLink}
          className="font-display text-xl font-semibold tracking-tight text-text"
        >
          {SITE_MESSAGES.name}
        </Link>
        <nav aria-label={SITE_MESSAGES.mainNavigation} className="flex-1">
          <Link
            href={CATALOG_PATH}
            className="text-sm text-text-muted transition-colors duration-(--duration-fast) hover:text-text"
          >
            {SITE_MESSAGES.catalogLink}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {search}
          {preferences}
          {account}
          {cart}
        </div>
      </div>
    </header>
  );
}
