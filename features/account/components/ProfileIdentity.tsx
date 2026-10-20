/**
 * Read-only part of « Mon profil »: name, email, user name and address as stored, plus the link
 * to the Keycloak account console for the password (FR-029). Email and user name are owned by
 * Keycloak and never editable here; no account deletion is offered.
 *
 * @see specs/003-account-orders/spec.md US4 scenarios 1 and 4, FR-028, FR-029
 */
import { ExternalLink, KeyRound } from "lucide-react";
import type { ReactNode } from "react";

import { PROFILE_MESSAGES } from "../messages";
import type { ProfileView } from "../profile-view";

/** Props of {@link ProfileIdentity}. */
export interface ProfileIdentityProps {
  readonly view: ProfileView;
  /** URL of the Keycloak account console (server-derived). */
  readonly consoleUrl: string;
}

/**
 * One read-only entry.
 *
 * @param props - Label and value.
 * @returns The term and its description.
 */
function Entry({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/**
 * Identity card.
 *
 * @param props - Profile and console URL.
 * @returns The card.
 */
export function ProfileIdentity({ view, consoleUrl }: ProfileIdentityProps): ReactNode {
  return (
    <section
      aria-labelledby="profile-identity-title"
      className="glass flex flex-col gap-5 rounded-card p-6"
    >
      <h2 id="profile-identity-title" className="text-lg">
        {PROFILE_MESSAGES.identityTitle}
      </h2>
      <p className="font-display text-xl" data-testid="profile-name">
        {view.firstName} {view.lastName}
      </p>
      <dl className="flex flex-col gap-4">
        <Entry label={PROFILE_MESSAGES.emailLabel} value={view.email} />
        <Entry label={PROFILE_MESSAGES.usernameLabel} value={view.username} />
        <Entry
          label={PROFILE_MESSAGES.addressLabel}
          value={view.addressLine ?? PROFILE_MESSAGES.noAddress}
        />
      </dl>
      <p className="text-xs text-text-muted">{PROFILE_MESSAGES.readOnlyNotice}</p>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start text-sm text-brand-text underline underline-offset-4"
        >
          <KeyRound aria-hidden className="size-4" />
          {PROFILE_MESSAGES.passwordLink}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
        <p className="text-xs text-text-muted">{PROFILE_MESSAGES.passwordHint}</p>
      </div>
    </section>
  );
}
