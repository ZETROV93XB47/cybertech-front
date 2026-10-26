"use client";

/**
 * « Notifications du navigateur » in « Mon profil » (feature 005, US2): one switch turns the
 * notifications of this browser on and off. The text under it explains every state, refusals
 * included, and is announced to screen readers; after a conflict with another account,
 * « Activer pour mon compte » is offered. Nothing is shown in a browser without push, nor during
 * the server render.
 *
 * @see specs/005-web-push-notifications/spec.md US2, FR-005, FR-006, FR-008
 * @see specs/005-web-push-notifications/research.md R14
 */
import { Bell } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { usePushNotifications } from "../hooks/usePushNotifications";
import { PUSH_MESSAGES } from "../messages";

import { pushToggleView } from "./push-view";

/** Id of the section title, naming the section. */
const TITLE_ID = "push-toggle-title";

/**
 * Profile section with the notifications switch.
 *
 * @returns The section, or nothing when the browser cannot receive notifications.
 */
export function PushToggle(): ReactNode {
  const { status, enable, disable, reclaim } = usePushNotifications();
  const switchId = useId();
  const descriptionId = useId();
  const view = pushToggleView(status);
  if (view === null) {
    return null;
  }
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="glass flex flex-col gap-5 rounded-card p-6"
      data-testid="push-toggle"
    >
      <h2 id={TITLE_ID} className="flex items-center gap-2 text-lg">
        <Bell aria-hidden className="size-5 text-gold" />
        {PUSH_MESSAGES.sectionLabel}
      </h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={switchId}>{PUSH_MESSAGES.toggleLabel}</Label>
          <p id={descriptionId} aria-live="polite" className="text-sm text-text-muted">
            {view.description}
          </p>
        </div>
        <Switch
          id={switchId}
          aria-describedby={descriptionId}
          checked={view.isChecked}
          disabled={view.isDisabled}
          onCheckedChange={(checked) => void (checked ? enable() : disable())}
          className="mt-1"
        />
      </div>
      {view.offersReclaim && (
        <button
          type="button"
          onClick={() => void reclaim()}
          className="cta-gradient inline-flex h-10 items-center justify-center self-start rounded-button px-5 text-sm font-medium"
        >
          {PUSH_MESSAGES.reclaim}
        </button>
      )}
    </section>
  );
}
