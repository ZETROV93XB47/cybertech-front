"use client";

/**
 * Signed-in header account menu: a round avatar with the user's initials which opens, on hover
 * or on click / Enter / Space / ArrowDown, a panel with the user's name, the account sections and
 * « Se déconnecter » (as on most e-commerce sites).
 *
 * Disclosure pattern (button + panel of links), not an ARIA `menu`: the panel holds a navigation
 * landmark and a form, read and tabbed through like the rest of the page.
 *
 * @see specs/003-account-orders/spec.md FR-040
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { AccountIdentity } from "../account-identity";
import { useHoverDisclosure } from "../hooks/useHoverDisclosure";
import { AUTH_MESSAGES } from "../messages";

import { AccountMenuPanel } from "./AccountMenuPanel";

/** Key opening the menu and moving the focus to its first link. */
const ARROW_DOWN_KEY = "ArrowDown";

/** Props of {@link AccountAvatarMenu}. */
export interface AccountAvatarMenuProps {
  readonly identity: AccountIdentity;
  readonly signingOut: boolean;
  /** Clears the client state before the sign-out Server Action runs. */
  readonly onSignOut: () => void;
}

/**
 * Round avatar with the initials, inside the brand gradient ring.
 *
 * @param props - Initials and open state.
 * @returns The decorative avatar.
 */
function Avatar({
  initials,
  isOpen,
}: {
  readonly initials: string;
  readonly isOpen: boolean;
}): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "cta-gradient inline-flex size-10 items-center justify-center rounded-full p-0.5 transition-shadow duration-(--duration-fast)",
        isOpen && "shadow-cta",
      )}
    >
      <span className="inline-flex size-full items-center justify-center rounded-full bg-surface-2 font-display text-sm font-semibold tracking-wide text-text">
        {initials}
      </span>
    </span>
  );
}

/**
 * Avatar menu of the header.
 *
 * @param props - Identity and sign-out handlers.
 * @returns The avatar button and, when open, its panel.
 */
export function AccountAvatarMenu({
  identity,
  signingOut,
  onSignOut,
}: AccountAvatarMenuProps): ReactNode {
  const panelId = useId();
  const disclosure = useHoverDisclosure();
  const [focusFirst, setFocusFirst] = useState(false);
  const onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.key === ARROW_DOWN_KEY) {
      event.preventDefault();
      setFocusFirst(true);
      disclosure.open();
    }
  };
  return (
    <div
      ref={disclosure.rootRef}
      className="relative"
      onPointerEnter={disclosure.onPointerEnter}
      onPointerLeave={disclosure.onPointerLeave}
      onKeyDown={disclosure.onKeyDown}
      onBlur={disclosure.onBlur}
    >
      <button
        ref={disclosure.triggerRef}
        type="button"
        aria-label={AUTH_MESSAGES.accountMenuLabel(identity.fullName)}
        aria-expanded={disclosure.isOpen}
        aria-controls={disclosure.isOpen ? panelId : undefined}
        aria-haspopup="true"
        onClick={() => {
          setFocusFirst(false);
          disclosure.onTriggerClick();
        }}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex rounded-full"
      >
        <Avatar initials={identity.initials} isOpen={disclosure.isOpen} />
      </button>
      {disclosure.isOpen && (
        <AccountMenuPanel
          id={panelId}
          identity={identity}
          signingOut={signingOut}
          onSignOut={onSignOut}
          focusFirst={focusFirst}
          onNavigate={disclosure.close}
        />
      )}
    </div>
  );
}
