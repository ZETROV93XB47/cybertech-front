/**
 * Outcome of a card form: the confirmation in a polite live region, or the error (with a link
 * to sign in again after a session expiry) in an alert, so both are announced.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { loginPath } from "@/lib/auth/callback-url";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";

import { CARD_MESSAGES } from "../messages";

/** Props of {@link CardFeedback}. */
export interface CardFeedbackProps {
  /** Confirmation to announce, `null` when there is none. */
  readonly success: string | null;
  readonly error: string | undefined;
  readonly needsSignIn: boolean | undefined;
}

/**
 * Form feedback.
 *
 * @param props - Confirmation, error and sign-in flag.
 * @returns The messages.
 */
export function CardFeedback({ success, error, needsSignIn }: CardFeedbackProps): ReactNode {
  return (
    <>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-success">
        {success ?? ""}
      </p>
      {error !== undefined && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-rose">
          <p>{error}</p>
          {needsSignIn === true && (
            <Link href={loginPath(ACCOUNT_PATHS.card)} className="text-brand-text underline">
              {CARD_MESSAGES.errors.signInAgain}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
