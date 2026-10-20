"use client";

/**
 * « Modifier le titulaire ou l'expiration » of the saved card: holder name and the two expiry
 * selects, posted to the `updateBankCard` Server Action. Works without JavaScript; after a
 * refusal the typed values come back (FR-002). There is no number field: the number is
 * write-once on the backend, replacing the card is the way to change it.
 *
 * @see specs/003-account-orders/spec.md US5 scenarios 2 and 3, FR-031
 */
import { useActionState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { BankCardField, CardFormStatus } from "@/lib/enums/bank-card";

import { updateBankCard } from "../actions";
import { INITIAL_CARD_UPDATE_STATE } from "../card-state";
import type { CardView } from "../card-view";
import { CARD_MESSAGES } from "../messages";

import { CardFeedback } from "./CardFeedback";
import { CardFieldShell } from "./CardFieldShell";
import { ExpirySelects } from "./ExpirySelects";

/** Prefix of the ids of this form. */
const ID_PREFIX = "card-edit";

/** Props of {@link EditCardForm}. */
export interface EditCardFormProps {
  readonly card: CardView;
  readonly months: readonly string[];
  readonly years: readonly string[];
}

/**
 * Edit form of the saved card.
 *
 * @param props - Saved card and expiry options.
 * @returns The form.
 */
export function EditCardForm({ card, months, years }: EditCardFormProps): ReactNode {
  const [state, formAction, pending] = useActionState(updateBankCard, INITIAL_CARD_UPDATE_STATE);
  const values = state.values ?? {
    holder: card.holder,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
  };
  const errors = state.fieldErrors;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <p className="text-xs text-text-muted">{CARD_MESSAGES.editHint}</p>
      <CardFieldShell
        id={`${ID_PREFIX}-holder`}
        label={CARD_MESSAGES.fields.holder}
        error={errors[BankCardField.CARD_HOLDER_NAME]}
      >
        {(control) => (
          <Input
            {...control}
            name={BankCardField.CARD_HOLDER_NAME}
            autoComplete="cc-name"
            defaultValue={values.holder}
          />
        )}
      </CardFieldShell>
      <ExpirySelects
        key={`${values.expiryMonth}-${values.expiryYear}`}
        idPrefix={ID_PREFIX}
        months={months}
        years={years}
        month={values.expiryMonth}
        year={values.expiryYear}
        error={errors[BankCardField.EXPIRY_MONTH]}
      />
      <CardFeedback
        success={state.status === CardFormStatus.SUCCESS ? CARD_MESSAGES.saved : null}
        error={state.formError}
        needsSignIn={state.needsSignIn}
      />
      <button
        type="submit"
        disabled={pending}
        className="cta-gradient inline-flex h-11 items-center justify-center self-start rounded-button px-8 font-medium disabled:opacity-60"
      >
        {pending ? CARD_MESSAGES.saving : CARD_MESSAGES.save}
      </button>
    </form>
  );
}
