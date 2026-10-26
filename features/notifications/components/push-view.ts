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

/** Content of the profile switch for one state. */
export interface PushToggleView {
  /** Text under the switch, announced when it changes. */
  readonly description: string;
  readonly isChecked: boolean;
  /** The switch cannot be used (running action, blocked, unavailable, install needed). */
  readonly isDisabled: boolean;
  /** « Activer pour mon compte » is offered, after a conflict. */
  readonly offersReclaim: boolean;
}

/**
 * Builds a view of the profile switch.
 *
 * @param description - Text under the switch.
 * @param isChecked - Whether notifications are on.
 * @param isDisabled - Whether the switch is disabled.
 * @param offersReclaim - Whether « Activer pour mon compte » is offered.
 * @returns The view.
 */
function toggle(
  description: string,
  isChecked: boolean,
  isDisabled: boolean,
  offersReclaim = false,
): PushToggleView {
  return { description, isChecked, isDisabled, offersReclaim };
}

/**
 * Content of the profile switch for a state.
 *
 * @param status - Current state.
 * @returns The view; `UNSUPPORTED` gives `null` (the section is not shown).
 */
export function pushToggleView(status: PushStatus): PushToggleView | null {
  switch (status.state) {
    case PushState.UNSUPPORTED:
      return null;
    case PushState.IDLE:
      return toggle(PUSH_MESSAGES.toggleDescription, false, false);
    case PushState.PENDING:
      return toggle(PUSH_MESSAGES.toggleDescription, false, true);
    case PushState.ENABLED:
      return toggle(status.message ?? PUSH_MESSAGES.toggleEnabled, true, false);
    case PushState.DENIED:
      return toggle(PUSH_MESSAGES.denied, false, true);
    case PushState.UNAVAILABLE:
      return toggle(PUSH_MESSAGES.unavailable, false, true);
    case PushState.CONFLICT:
      // Toggling would send the same endpoint again: only the reclaim helps.
      return toggle(PUSH_MESSAGES.conflict, false, true, true);
    case PushState.INSTALL_REQUIRED:
      return toggle(PUSH_MESSAGES.installRequired, false, true);
    case PushState.ERROR:
      return toggle(status.message ?? PUSH_MESSAGES.error, false, false);
    default:
      return assertNever(status.state);
  }
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
