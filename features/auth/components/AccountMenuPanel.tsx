"use client";

/**
 * Panel of the header account menu: greeting with the user's name and email, links to the
 * account sections (current one marked), then « Se déconnecter ».
 *
 * Rendered only while the menu is open, so the name never stays in the page once it is closed.
 * At full effects it grows from the avatar (fade, drop and slight zoom anchored top right), its
 * rows come in one after the other and a row's icon slides with a chevron on hover; reduced or
 * disabled effects and `prefers-reduced-motion` give the static panel.
 *
 * @see specs/003-account-orders/spec.md FR-040
 */
import { ChevronRight, LogOut } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { ACCOUNT_MENU_ITEMS, isCurrentSection } from "@/features/account/account-sections";
import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { cn } from "@/lib/utils";
import { useMotionTokens } from "@/styles/motion";

import type { AccountIdentity } from "../account-identity";
import { signOutEverywhere } from "../actions";
import { AUTH_MESSAGES } from "../messages";

/** Vertical offset of the panel at the start of its opening, in Motion units (pixels). */
const PANEL_DROP_OFFSET = -6;

/** Scale of the panel at the start of its opening (it grows from the avatar). */
const PANEL_START_SCALE = 0.96;

/** Horizontal offset of a row at the start of the staggered entrance, in Motion units. */
const ROW_SLIDE_OFFSET = 8;

/** The panel grows from the avatar, at its top right corner. */
const PANEL_ORIGIN = { transformOrigin: "top right" } as const;

/** Style of every row of the panel (links and sign-out button). */
const ROW_CLASS =
  "group relative flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text";

/** Props of {@link AccountMenuPanel}. */
export interface AccountMenuPanelProps {
  /** DOM id, referenced by the trigger's `aria-controls`. */
  readonly id: string;
  readonly identity: AccountIdentity;
  /** Whether the sign-out is running. */
  readonly signingOut: boolean;
  /** Clears the client state before the sign-out Server Action runs. */
  readonly onSignOut: () => void;
  /** Focus the first link once rendered (opening from the keyboard). */
  readonly focusFirst: boolean;
  /** Closes the menu (a link was followed). */
  readonly onNavigate: () => void;
}

/**
 * Greeting, name and email.
 *
 * @param props - Identity.
 * @returns The panel header.
 */
function PanelHeader({ identity }: { readonly identity: AccountIdentity }): ReactNode {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 pt-2 pb-3">
      <span
        aria-hidden
        className="cta-gradient inline-flex size-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold"
      >
        {identity.initials}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-display text-base text-text">
          {AUTH_MESSAGES.accountMenuGreeting(identity.firstName)}
        </p>
        <p data-testid="account-name" className="truncate text-sm text-text">
          {identity.fullName}
        </p>
        {identity.email !== null && identity.email !== identity.fullName && (
          <p className="truncate text-xs text-text-muted">{identity.email}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Inner part of a row: current-page pill, icon that slides on hover, label and a chevron that
 * shows on hover.
 *
 * @param props - Icon, label and current state.
 * @returns The row content.
 */
function RowContent({
  icon: Icon,
  label,
  isCurrent,
}: {
  readonly icon: (typeof ACCOUNT_MENU_ITEMS)[number]["icon"];
  readonly label: string;
  readonly isCurrent: boolean;
}): ReactNode {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-1 w-1 rounded-full bg-gold transition-opacity duration-(--duration-fast)",
          isCurrent ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        aria-hidden
        className={cn(
          "size-4 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-brand-text",
          isCurrent && "text-gold",
        )}
      />
      <span className="flex-1">{label}</span>
      <ChevronRight
        aria-hidden
        className="size-4 -translate-x-1 opacity-0 transition duration-(--duration-fast) group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </>
  );
}

/**
 * Links to the account sections.
 *
 * @param props - Ref of the first link and navigation handler.
 * @returns The navigation landmark.
 */
function PanelLinks({
  firstLinkRef,
  onNavigate,
  isAnimated,
}: {
  readonly firstLinkRef: RefObject<HTMLAnchorElement | null>;
  readonly onNavigate: () => void;
  readonly isAnimated: boolean;
}): ReactNode {
  const pathname = usePathname();
  const tokens = useMotionTokens();
  return (
    <nav aria-label={AUTH_MESSAGES.accountMenuLinks} className="py-2">
      <ul className="flex flex-col gap-0.5">
        {ACCOUNT_MENU_ITEMS.map(({ href, label, icon }, index) => {
          const isCurrent = isCurrentSection(pathname, href);
          return (
            <motion.li
              key={href}
              initial={isAnimated ? { opacity: 0, x: ROW_SLIDE_OFFSET } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...tokens.fast, delay: (index + 1) * tokens.staggerSeconds }}
            >
              <Link
                ref={index === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={onNavigate}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(ROW_CLASS, isCurrent && "bg-surface-2 font-medium text-text")}
              >
                <RowContent icon={icon} label={label} isCurrent={isCurrent} />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * « Se déconnecter », keeping the sign-out flow of the header (client state cleared first, then
 * the Server Action closing the Keycloak session).
 *
 * @param props - Busy state and handler.
 * @returns The sign-out form.
 */
function SignOutForm({
  signingOut,
  onSignOut,
}: {
  readonly signingOut: boolean;
  readonly onSignOut: () => void;
}): ReactNode {
  return (
    <form action={signOutEverywhere} onSubmit={onSignOut} className="border-t border-border pt-2">
      <button
        type="submit"
        disabled={signingOut}
        className={cn(ROW_CLASS, "hover:text-rose disabled:opacity-50")}
      >
        <LogOut aria-hidden className="size-4" />
        {signingOut ? AUTH_MESSAGES.signingOut : AUTH_MESSAGES.signOut}
      </button>
    </form>
  );
}

/**
 * Panel of the account menu.
 *
 * @param props - Id, identity, sign-out state and handlers.
 * @returns The panel, anchored under the avatar, right-aligned.
 */
export function AccountMenuPanel(props: AccountMenuPanelProps): ReactNode {
  const { id, identity, signingOut, onSignOut, focusFirst, onNavigate } = props;
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const tokens = useMotionTokens();
  const isAnimated = useEffectiveEffects().level === EffectsLevel.FULL;
  useEffect(() => {
    if (focusFirst) {
      firstLinkRef.current?.focus();
    }
  }, [focusFirst]);
  return (
    <motion.div
      id={id}
      initial={isAnimated ? { opacity: 0, y: PANEL_DROP_OFFSET, scale: PANEL_START_SCALE } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={tokens.base}
      style={PANEL_ORIGIN}
      className="absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-card border border-border bg-surface p-2 shadow-card-hover"
    >
      <span aria-hidden className="cta-gradient absolute inset-x-0 top-0 h-0.5" />
      <PanelHeader identity={identity} />
      <PanelLinks firstLinkRef={firstLinkRef} onNavigate={onNavigate} isAnimated={isAnimated} />
      <SignOutForm signingOut={signingOut} onSignOut={onSignOut} />
    </motion.div>
  );
}
