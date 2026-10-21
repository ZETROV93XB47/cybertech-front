"use client";

/**
 * « Appliquer à mon panier » of a campaign page: stores the campaign key for the tab, with the
 * same mechanism as the discount block of the cart (`ct_discount_v1`), so the cart and the
 * checkout open with this discount already chosen (FR-014).
 *
 * A signed-in customer is told the discount is selected, with a link to the cart. A visitor keeps
 * the key (the sign-in happens in the same tab) and is invited to sign in, since discounts need
 * an account. No amount is computed here: the cart quote stays the only judge, and refuses a
 * campaign that ended meanwhile (feature 003).
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4 scenarios 3 and 4
 * @see features/checkout/discount-storage.ts
 */
import { TicketPercent } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { MagneticButton } from "@/components/effects/MagneticButton";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { writeDiscountKey } from "@/features/checkout/discount-storage";
import { assertNever } from "@/lib/assert-never";
import { loginPath } from "@/lib/auth/callback-url";
import { CART_PATH } from "@/lib/constants/routes";
import { ApplyCampaignOutcome } from "@/lib/enums/promotions";

import { CAMPAIGN_MESSAGES } from "../messages";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/** Props of {@link ApplyCampaignButton}. */
export interface ApplyCampaignButtonProps {
  /** Campaign key, stored as typed by the backend. */
  readonly campaignKey: string;
  /** Display name, used in the confirmation. */
  readonly campaignName: string;
  /** Secondary action shown beside the button (« Voir le catalogue »). */
  readonly secondaryAction?: ReactNode;
}

/**
 * Stores the key and tells what happened.
 *
 * @param key - Campaign key.
 * @param signedIn - Whether the customer is signed in.
 * @returns The outcome to announce.
 */
export function applyCampaign(key: string, signedIn: boolean): ApplyCampaignOutcome {
  if (writeDiscountKey(window.sessionStorage, key) === null) {
    return ApplyCampaignOutcome.STORAGE_UNAVAILABLE;
  }
  return signedIn ? ApplyCampaignOutcome.APPLIED : ApplyCampaignOutcome.SIGN_IN_NEEDED;
}

/**
 * Message and follow-up link of an outcome.
 *
 * @param props - Outcome and campaign name.
 * @returns The announcement content.
 */
function OutcomeMessage({
  outcome,
  name,
}: {
  readonly outcome: ApplyCampaignOutcome;
  readonly name: string;
}): ReactNode {
  const linkClass = "font-medium text-brand-text underline underline-offset-4";
  switch (outcome) {
    case ApplyCampaignOutcome.APPLIED:
      return (
        <span className="text-success">
          {CAMPAIGN_MESSAGES.applied(name)}{" "}
          <Link href={CART_PATH} className={linkClass}>
            {CAMPAIGN_MESSAGES.goToCart}
          </Link>
        </span>
      );
    case ApplyCampaignOutcome.SIGN_IN_NEEDED:
      return (
        <span className="text-text">
          {CAMPAIGN_MESSAGES.signInNeeded(name)}{" "}
          <Link href={loginPath(CART_PATH)} className={linkClass}>
            {CAMPAIGN_MESSAGES.signIn}
          </Link>
        </span>
      );
    case ApplyCampaignOutcome.STORAGE_UNAVAILABLE:
      return <span className="text-rose">{CAMPAIGN_MESSAGES.storageUnavailable}</span>;
    default:
      return assertNever(outcome);
  }
}

/**
 * Apply button and its polite announcement.
 *
 * @param props - Campaign key, name and secondary action.
 * @returns The button and the secondary action, then the live region.
 */
export function ApplyCampaignButton({
  campaignKey,
  campaignName,
  secondaryAction,
}: ApplyCampaignButtonProps): ReactNode {
  const { data: session, status } = useSession();
  const [outcome, setOutcome] = useState<ApplyCampaignOutcome | null>(null);
  const isLoading = status === LOADING_STATUS;
  const signedIn = status === AUTHENTICATED_STATUS && !session.error;
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <MagneticButton>
          <button
            type="button"
            disabled={isLoading}
            aria-busy={isLoading}
            onClick={() => {
              setOutcome(applyCampaign(campaignKey, signedIn));
            }}
            className={PRIMARY_CTA_CLASS}
          >
            <TicketPercent aria-hidden className="size-5" />
            {isLoading ? CAMPAIGN_MESSAGES.applying : CAMPAIGN_MESSAGES.apply}
          </button>
        </MagneticButton>
        {secondaryAction}
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {outcome !== null && <OutcomeMessage outcome={outcome} name={campaignName} />}
      </p>
    </div>
  );
}
