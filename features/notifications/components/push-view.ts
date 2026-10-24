/**
 * What the notification opt-in and switch show for each state (feature 005, FR-005): title,
 * text, icon and the action offered. Pure, so that every state is tested once.
 *
 * @see specs/005-web-push-notifications/data-model.md §1
 */
import { Bell, BellOff, BellRing, type LucideIcon } from "lucide-react";

import { assertNever } from "@/lib/assert-never";
import { PushState } from "@/lib/enums/push";

import { PUSH_MESSAGES } from "../messages";
import type { PushStatus } from "../push-store";

/** Action offered next to the text. */
export enum PushAction {
  /** « Activer les notifications » (also to retry). */
  ENABLE = "enable",
  /** « Activer pour mon compte », after a conflict. */
  RECLAIM = "reclaim",
  /** Nothing to click. */
  NONE = "none",
}

/** Content shown for one state. */
export interface PushView {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly action: PushAction;
  /** An action is running: the button is disabled and says so. */
  readonly isBusy: boolean;
}

/**
 * Builds the view of the default card (offer to turn notifications on).
 *
 * @param body - Text under the title.
 * @param action - Action offered.
 * @param isBusy - Whether an action is running.
 * @returns The view.
 */
function offerView(body: string, action: PushAction, isBusy = false): PushView {
  return { icon: Bell, title: PUSH_MESSAGES.optInTitle, body, action, isBusy };
}

/**
 * Content of the opt-in for a state.
 *
 * @param status - Current state.
 * @returns The view; `UNSUPPORTED` gives `null` (nothing is shown).
 */
export function pushView(status: PushStatus): PushView | null {
  switch (status.state) {
    case PushState.UNSUPPORTED:
      return null;
    case PushState.IDLE:
      return offerView(PUSH_MESSAGES.optInBody, PushAction.ENABLE);
    case PushState.PENDING:
      return offerView(PUSH_MESSAGES.optInBody, PushAction.ENABLE, true);
    case PushState.ENABLED:
      return {
        icon: BellRing,
        title: PUSH_MESSAGES.enabledTitle,
        body: PUSH_MESSAGES.enabledBody,
        action: PushAction.NONE,
        isBusy: false,
      };
    case PushState.DENIED:
      return {
        icon: BellOff,
        title: PUSH_MESSAGES.deniedTitle,
        body: PUSH_MESSAGES.denied,
        action: PushAction.NONE,
        isBusy: false,
      };
    case PushState.UNAVAILABLE:
      return offerView(PUSH_MESSAGES.unavailable, PushAction.ENABLE);
    case PushState.CONFLICT:
      return offerView(PUSH_MESSAGES.conflict, PushAction.RECLAIM);
    case PushState.INSTALL_REQUIRED:
      return offerView(PUSH_MESSAGES.installRequired, PushAction.NONE);
    case PushState.ERROR:
      return offerView(status.message ?? PUSH_MESSAGES.error, PushAction.ENABLE);
    default:
      return assertNever(status.state);
  }
}
