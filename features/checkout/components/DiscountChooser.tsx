"use client";

/**
 * Chooser of the discount block: the active campaigns with their advantage and conditions, and
 * a field to type the key of a campaign. Only the typing is local: the choice is checked by the
 * quote of `useDiscountedQuote`.
 *
 * @see specs/003-account-orders/spec.md US2-1, US2-4, US2-7, FR-017, FR-018
 */
import { useId, useState, type ReactNode, type SyntheticEvent } from "react";

import { Input } from "@/components/ui/input";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import { cn } from "@/lib/utils";

import { describeDiscountOffer } from "../discount-offer";
import { DISCOUNT_MESSAGES } from "../messages";

/** Props of {@link DiscountChooser}. */
export interface DiscountChooserProps {
  /** Displayable campaigns (`NO_DISCOUNT` already left out). */
  readonly campaigns: readonly ActiveDiscount[];
  readonly appliedKey: string | null;
  /** A key is being checked: choices are disabled meanwhile. */
  readonly isChecking: boolean;
  /** Error about the typed key, shown under the field. */
  readonly keyError: string | null;
  readonly onPropose: (key: string) => void;
}

/**
 * Campaign list; nothing when there is no campaign (US2-7: no empty list).
 *
 * @param props - Chooser props.
 * @returns The list, or `null`.
 */
function CampaignList({
  campaigns,
  appliedKey,
  isChecking,
  onPropose,
}: DiscountChooserProps): ReactNode {
  if (campaigns.length === 0) {
    return null;
  }
  return (
    <ul aria-label={DISCOUNT_MESSAGES.campaignsLabel} className="flex flex-col gap-2">
      {campaigns.map((campaign) => {
        const offer = describeDiscountOffer(campaign);
        const isApplied = offer.key === appliedKey;
        return (
          <li key={offer.key}>
            <button
              type="button"
              aria-pressed={isApplied}
              disabled={isChecking}
              onClick={() => {
                onPropose(offer.key);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-card border border-border p-3 text-left transition-colors duration-(--duration-fast) hover:border-brand-text disabled:opacity-60",
                isApplied && "border-gold",
              )}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{offer.key}</span>
                <span className="price text-gold">{offer.advantage}</span>
              </span>
              {offer.conditions.length > 0 && (
                <span className="text-xs text-text-muted">{offer.conditions.join(" · ")}</span>
              )}
              <span className="text-xs text-brand-text">
                {isApplied ? DISCOUNT_MESSAGES.applied : DISCOUNT_MESSAGES.apply}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Field to type a campaign key.
 *
 * @param props - Chooser props.
 * @returns The form.
 */
function DiscountKeyForm({ isChecking, keyError, onPropose }: DiscountChooserProps): ReactNode {
  const [value, setValue] = useState("");
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        onPropose(value);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {DISCOUNT_MESSAGES.keyLabel}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          name="discountKey"
          value={value}
          autoComplete="off"
          placeholder={DISCOUNT_MESSAGES.keyPlaceholder}
          aria-invalid={keyError ? true : undefined}
          aria-describedby={keyError ? errorId : undefined}
          onChange={(event) => {
            setValue(event.currentTarget.value);
          }}
        />
        <button
          type="submit"
          disabled={isChecking || value.trim() === ""}
          className="h-9 shrink-0 rounded-button border border-border px-3 text-sm transition-colors duration-(--duration-fast) hover:border-brand-text disabled:opacity-40"
        >
          {DISCOUNT_MESSAGES.keySubmit}
        </button>
      </div>
      {keyError && (
        <p id={errorId} role="alert" className="text-sm text-rose">
          {keyError}
        </p>
      )}
    </form>
  );
}

/**
 * Campaigns and key field.
 *
 * @param props - Campaigns, applied key, checking state, key error and handler.
 * @returns The chooser.
 */
export function DiscountChooser(props: DiscountChooserProps): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <CampaignList {...props} />
      <DiscountKeyForm {...props} />
    </div>
  );
}
