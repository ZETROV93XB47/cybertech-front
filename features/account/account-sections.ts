/**
 * Sections of the account area, shared by the side navigation of `/account/**` (`AccountNav`)
 * and the header account menu (`AccountMenu`), so both always list the same pages.
 *
 * Only sections whose page exists are listed; « Ma carte » joined with US5 and appears in both
 * places at once.
 *
 * @see specs/003-account-orders/tasks.md T050, T061, T098
 */
import {
  CreditCard,
  Heart,
  MessageSquareText,
  Package,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { ACCOUNT_PATHS } from "@/lib/constants/routes";

import { ACCOUNT_NAV_MESSAGES } from "./messages";

/** One section of the account area. */
export interface AccountSection {
  /** Path of the section page. */
  readonly href: string;
  /** Visible label (French). */
  readonly label: string;
  /** Decorative icon shown before the label. */
  readonly icon: LucideIcon;
}

/**
 * Sections, in display order. Also the items of the header account menu
 * (`ACCOUNT_MENU_ITEMS`).
 */
export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { href: ACCOUNT_PATHS.orders, label: ACCOUNT_NAV_MESSAGES.orders, icon: Package },
  { href: ACCOUNT_PATHS.reviews, label: ACCOUNT_NAV_MESSAGES.reviews, icon: MessageSquareText },
  { href: ACCOUNT_PATHS.wishlist, label: ACCOUNT_NAV_MESSAGES.wishlist, icon: Heart },
  { href: ACCOUNT_PATHS.profile, label: ACCOUNT_NAV_MESSAGES.profile, icon: UserRound },
  { href: ACCOUNT_PATHS.card, label: ACCOUNT_NAV_MESSAGES.card, icon: CreditCard },
];

/** Items of the header account menu: the account sections, in the same order. */
export const ACCOUNT_MENU_ITEMS: readonly AccountSection[] = ACCOUNT_SECTIONS;

/**
 * Whether a section is the current one (its page or one of its sub-pages).
 *
 * @param pathname - Current path.
 * @param href - Section path.
 * @returns `true` for the current section.
 */
export function isCurrentSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
