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
import { LogOut } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import {
  DROPDOWN_ROW_CLASS,
  DROPDOWN_ROW_CURRENT_CLASS,
  DropdownRowContent,
} from "@/components/dropdown/DropdownRow";
import { DropPanel, PanelOrigin } from "@/components/effects/DropPanel";
import { ACCOUNT_MENU_ITEMS, isCurrentSection } from "@/features/account/account-sections";
import { PushSignOutField } from "@/features/notifications/components/PushSignOutField";
import { clearLocalPushSubscription } from "@/features/notifications/push-client";
import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { cn } from "@/lib/utils";
import { useMotionTokens } from "@/styles/motion";

import type { AccountIdentity } from "../account-identity";
import { signOutEverywhere } from "../actions";
import { AUTH_MESSAGES } from "../messages";

/** Horizontal offset of a row at the start of the staggered entrance, in Motion units. */
const ROW_SLIDE_OFFSET = 8;

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
                className={cn(DROPDOWN_ROW_CLASS, isCurrent && DROPDOWN_ROW_CURRENT_CLASS)}
              >
                <DropdownRowContent icon={icon} label={label} isCurrent={isCurrent} />
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
 * the Server Action closing the Keycloak session). The form carries the push subscription UUID,
 * deleted on the backend by the action; the browser forgets its notifications on submit
 * (feature 005, research R8).
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
    <form
      action={signOutEverywhere}
      onSubmit={() => {
        // The UUID is already in the hidden field: the browser side can be forgotten at once.
        clearLocalPushSubscription();
        onSignOut();
      }}
      className="border-t border-border pt-2"
    >
      <PushSignOutField />
      <button
        type="submit"
        disabled={signingOut}
        className={cn(DROPDOWN_ROW_CLASS, "hover:text-rose disabled:opacity-50")}
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
  const isAnimated = useEffectiveEffects().level === EffectsLevel.FULL;
  useEffect(() => {
    if (focusFirst) {
      firstLinkRef.current?.focus();
    }
  }, [focusFirst]);
  return (
    <DropPanel
      id={id}
      origin={PanelOrigin.TOP_RIGHT}
      className="absolute top-full right-0 z-50 mt-2 w-72"
    >
      <PanelHeader identity={identity} />
      <PanelLinks firstLinkRef={firstLinkRef} onNavigate={onNavigate} isAnimated={isAnimated} />
      <SignOutForm signingOut={signingOut} onSignOut={onSignOut} />
    </DropPanel>
  );
}
