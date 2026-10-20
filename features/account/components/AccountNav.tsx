"use client";

/**
 * Navigation of the account area, next to every `/account/**` page: one link per section, the
 * current one marked with `aria-current="page"` and a gold accent (never colour alone: the
 * link also gets its weight and background).
 *
 * The sections come from `account-sections.ts`, shared with the header account menu; « Ma
 * carte » (US5) joins the list when its page exists.
 *
 * @see specs/003-account-orders/tasks.md T050
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ACCOUNT_SECTIONS, isCurrentSection } from "../account-sections";
import { ACCOUNT_NAV_MESSAGES } from "../messages";

/**
 * Account navigation.
 *
 * @returns The navigation landmark.
 */
export function AccountNav(): ReactNode {
  const pathname = usePathname();
  return (
    <nav aria-label={ACCOUNT_NAV_MESSAGES.label} className="glass rounded-card p-3">
      <p className="px-3 pt-2 pb-3 text-xs tracking-wide text-text-muted uppercase">
        {ACCOUNT_NAV_MESSAGES.title}
      </p>
      <ul className="flex flex-col gap-1">
        {ACCOUNT_SECTIONS.map(({ href, label, icon: Icon }) => {
          const isCurrent = isCurrentSection(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-button border-l-2 border-transparent px-3 py-2.5 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text",
                  isCurrent && "border-gold bg-surface-2 font-medium text-text",
                )}
              >
                <Icon aria-hidden className={cn("size-4", isCurrent && "text-gold")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
