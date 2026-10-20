"use client";

/**
 * « Ajouter une carte »: the typed values, the replacement confirmation, and the sending to
 * `POST /api/bank-card`. The number is emptied from the state as soon as it is sent, whatever
 * the answer, and never written to the browser storage (constitution V v3.0.0). On success the
 * page is refreshed (the masked card shows) and the customer goes back to `returnTo`; a failed
 * replacement keeps the previous card, and the message says so.
 *
 * @see specs/003-account-orders/research.md R21
 */
import { useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";

import { BffError, bffSend } from "@/lib/api/bff-client";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { CardFormStatus } from "@/lib/enums/bank-card";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { AddedCardSchema } from "@/lib/schemas/bank-card";

import {
  emptyAddCardValues,
  toAddCardBody,
  validateAddCard,
  type AddCardValues,
} from "../add-card-form";
import { cardFailure } from "../card-errors";
import type { CardFailure, CardFieldErrors } from "../card-state";
import { CARD_MESSAGES } from "../messages";

/** Outcome shown under the form. */
export interface AddCardOutcome extends Partial<CardFailure> {
  readonly status: CardFormStatus;
}

/** Result of {@link useAddCard}. */
export interface UseAddCardResult {
  readonly values: AddCardValues;
  readonly setValues: Dispatch<SetStateAction<AddCardValues>>;
  readonly errors: CardFieldErrors;
  readonly outcome: AddCardOutcome;
  readonly isPending: boolean;
  /** Whether the replacement dialog is open. */
  readonly isConfirming: boolean;
  readonly setConfirming: (open: boolean) => void;
  /** Validates, then asks for the replacement confirmation or sends. */
  readonly submit: () => void;
  /** Sends after the replacement was confirmed. */
  readonly confirmReplace: () => void;
}

/**
 * What the form shows after a refused add.
 *
 * @param error - Thrown value.
 * @returns The outcome: a field to fix, the session to renew, or (failed replacement) the
 *   previous card being kept.
 */
export function addCardFailure(error: unknown): AddCardOutcome {
  const bffError = error instanceof BffError ? error : null;
  const failure = cardFailure(
    bffError?.code ?? FrontErrorCode.UNKNOWN,
    bffError?.retryAfterSeconds,
  );
  if (failure.needsSignIn === true) {
    return {
      ...failure,
      status: CardFormStatus.ERROR,
      formError: CARD_MESSAGES.errors.sessionExpiredNumber,
    };
  }
  if (bffError?.cardKept === true && failure.fieldErrors === undefined) {
    return { status: CardFormStatus.ERROR, formError: CARD_MESSAGES.errors.cardKept };
  }
  return { ...failure, status: CardFormStatus.ERROR };
}

/**
 * Sending of the card, with its pending state.
 *
 * @param returnTo - Safe relative path to go back to after success, or `null`.
 * @param setValues - Setter of the form values (to empty the number).
 * @param setOutcome - Setter of the outcome.
 * @returns The send function and whether a request is running.
 */
function useCardSender(
  returnTo: string | null,
  setValues: Dispatch<SetStateAction<AddCardValues>>,
  setOutcome: (outcome: AddCardOutcome) => void,
): {
  readonly send: (values: AddCardValues, replace: boolean) => Promise<void>;
  readonly isPending: boolean;
} {
  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const send = async (values: AddCardValues, replace: boolean): Promise<void> => {
    const body = toAddCardBody(values, replace);
    // The number leaves the state before the answer is known.
    setValues((current) => ({ ...current, digits: "" }));
    setPending(true);
    try {
      await bffSend(BFF_ROUTES.bankCard, HttpMethod.POST, AddedCardSchema, body);
      setOutcome({ status: CardFormStatus.SUCCESS });
      if (returnTo !== null) {
        router.push(returnTo);
      }
    } catch (error) {
      setOutcome(addCardFailure(error));
    } finally {
      setPending(false);
      router.refresh();
    }
  };
  return { send, isPending };
}

/**
 * State and actions of the add form.
 *
 * @param hasCard - Whether a card is saved (adding then replaces it, after confirmation).
 * @param returnTo - Safe relative path to go back to after success, or `null`.
 * @param holder - Holder to prefill (the saved card's), if any.
 * @returns The form state and its actions.
 */
export function useAddCard(
  hasCard: boolean,
  returnTo: string | null,
  holder = "",
): UseAddCardResult {
  const [values, setValues] = useState(() => emptyAddCardValues(holder));
  const [errors, setErrors] = useState<CardFieldErrors>({});
  const [outcome, setOutcome] = useState<AddCardOutcome>({ status: CardFormStatus.IDLE });
  const [isConfirming, setConfirming] = useState(false);
  const { send, isPending } = useCardSender(returnTo, setValues, setOutcome);
  const submit = (): void => {
    const found = validateAddCard(values, new Date());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setOutcome({ status: CardFormStatus.ERROR, formError: CARD_MESSAGES.errors.form });
    } else if (hasCard) {
      setConfirming(true);
    } else {
      void send(values, false);
    }
  };
  const confirmReplace = (): void => {
    setConfirming(false);
    void send(values, true);
  };
  return {
    values,
    setValues,
    errors,
    outcome,
    isPending,
    isConfirming,
    setConfirming,
    submit,
    confirmReplace,
  };
}
