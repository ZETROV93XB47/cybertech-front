"use client";

/**
 * Home page title: « Bienvenue » from the server, then « Bonjour » / « Bonsoir » from the local
 * time, or « Content de te revoir » for a visitor with recently viewed products (FR-001).
 */
import { useSyncExternalStore, type ReactNode } from "react";

import { greetingFor } from "../greeting";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { GREETING_MESSAGES } from "../messages";

/**
 * Nothing to subscribe to: the greeting is computed once per render.
 *
 * @returns A no-op unsubscribe function.
 */
function subscribe(): () => void {
  return () => undefined;
}

/**
 * Greeting of the current hour.
 *
 * @returns The greeting.
 */
function getSnapshot(): string {
  return greetingFor(new Date());
}

/**
 * Server snapshot: the server does not know the visitor's time zone.
 *
 * @returns The neutral greeting.
 */
function getServerSnapshot(): string {
  return GREETING_MESSAGES.neutral;
}

/** Props of {@link Greeting}. */
export interface GreetingProps {
  readonly className?: string;
  /** Personal title of a signed-in user (« Content de te revoir, Camille »); wins over the rest. */
  readonly personalTitle?: string | undefined;
}

/**
 * Main title of the home page.
 *
 * @param props - Optional class names and personal title.
 * @returns The `h1`.
 */
export function Greeting({ className, personalTitle }: GreetingProps): ReactNode {
  const greeting = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReturning = useRecentlyViewed().length > 0;
  if (personalTitle) {
    return <h1 className={className}>{personalTitle}</h1>;
  }
  return <h1 className={className}>{isReturning ? GREETING_MESSAGES.returning : greeting}</h1>;
}
