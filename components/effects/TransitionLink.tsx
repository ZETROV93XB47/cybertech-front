"use client";

/**
 * Link that opens its page inside a view transition when the effects level allows it, so the
 * product photo flies from the card to the product page. A plain `next/link` otherwise (no
 * support, effects off, modified click).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";

import { navigateWithTransition, supportsViewTransitions } from "./view-transition";

/** Main mouse button. */
const PRIMARY_BUTTON = 0;

/** Props of {@link TransitionLink}. */
export interface TransitionLinkProps {
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Tells whether a click is a plain one (no new tab, no modifier).
 *
 * @param event - Click event.
 * @returns `true` for a plain left click.
 */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === PRIMARY_BUTTON &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Link with a shared-element transition.
 *
 * @param props - Target, classes and content.
 * @returns The link.
 */
export function TransitionLink({ href, className, children }: TransitionLinkProps): ReactNode {
  const router = useRouter();
  const enabled = useEffectiveEffects().settings.viewTransitions.enabled;
  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!enabled || !supportsViewTransitions() || !isPlainClick(event)) {
      return;
    }
    event.preventDefault();
    navigateWithTransition(() => {
      router.push(href);
    });
  };
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
