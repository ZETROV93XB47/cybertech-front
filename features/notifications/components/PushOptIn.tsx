"use client";

/**
 * « Sois prévenu quand ta commande est expédiée » on the order confirmation page (feature 005,
 * US1): one click turns the browser notifications on. The browser prompt only appears after
 * that click (FR-001); the card then tells the result, announced to screen readers. Nothing is
 * shown in a browser without push, nor during the server render.
 *
 * @see specs/005-web-push-notifications/spec.md US1, FR-004, FR-005
 * @see specs/005-web-push-notifications/research.md R14
 */
import type { ReactNode } from "react";

import { usePushNotifications } from "../hooks/usePushNotifications";
import { PUSH_MESSAGES } from "../messages";

import { PushAction, pushView } from "./push-view";

/** Id of the title, naming the section. */
const TITLE_ID = "push-opt-in-title";

/**
 * Opt-in card.
 *
 * @returns The card, or nothing when the browser cannot receive notifications.
 */
export function PushOptIn(): ReactNode {
  const { status, enable, reclaim } = usePushNotifications();
  const view = pushView(status);
  if (view === null) {
    return null;
  }
  const { icon: Icon, title, body, action, isBusy } = view;
  const onClick = action === PushAction.RECLAIM ? reclaim : enable;
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="glass flex items-start gap-4 rounded-card p-6"
      data-testid="push-opt-in"
    >
      <Icon aria-hidden className="mt-1 size-6 shrink-0 text-gold" />
      <div className="flex flex-col gap-3">
        <h2 id={TITLE_ID} className="text-lg">
          {title}
        </h2>
        <p aria-live="polite" className="text-sm text-text-muted">
          {body}
        </p>
        {action !== PushAction.NONE && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onClick()}
            className="cta-gradient inline-flex h-10 items-center justify-center self-start rounded-button px-5 text-sm font-medium disabled:opacity-60"
          >
            {buttonLabel(action, isBusy)}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Label of the action button.
 *
 * @param action - Action offered.
 * @param isBusy - Whether an action is running.
 * @returns The label.
 */
function buttonLabel(action: PushAction, isBusy: boolean): string {
  if (isBusy) {
    return PUSH_MESSAGES.enabling;
  }
  return action === PushAction.RECLAIM ? PUSH_MESSAGES.reclaim : PUSH_MESSAGES.enable;
}
