"use server";

/**
 * Server Actions of the account area (feature 003): profile update (US4), saved-card update
 * and deletion (US5). Adding a card goes through the BFF route `POST /api/bank-card` instead,
 * so that the number never enters a form state that could be sent back to the page.
 *
 * Each action validates with the same Zod schema as the form, reads the user's token on the
 * server and never logs a field value (contracts §5).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 * @see specs/003-account-orders/research.md R17
 */
import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/errors";
import {
  deleteBankCard as deleteSavedCard,
  getBankCard,
  updateBankCard as updateSavedCard,
} from "@/lib/api/endpoints/bank-card";
import { updateMe } from "@/lib/api/endpoints/users";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { ACCOUNT_PATHS, CHECKOUT_PATH } from "@/lib/constants/routes";
import { CardFormStatus } from "@/lib/enums/bank-card";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { ProfileStatus } from "@/lib/enums/profile";
import { ProfileUpdateSchema, readProfileForm, toProfileFieldErrors } from "@/lib/schemas/user";

import { cardFailure } from "./card-errors";
import {
  readCardUpdateForm,
  toCardUpdate,
  validateCardUpdate,
  type CardDeleteState,
  type CardFailure,
  type CardUpdateState,
} from "./card-state";
import { CARD_MESSAGES, PROFILE_MESSAGES } from "./messages";
import { toProfileFailure } from "./profile-errors";
import { savedValues, type ProfileActionState } from "./profile-state";

/**
 * Updates the profile of the signed-in user (`PATCH /user/me`). Names are always sent, the
 * phone and the address fields only when typed. On success the profile page and the checkout
 * (address prefill) are revalidated. An expired session does not redirect: the form explains it
 * and keeps the typed values (FR-002). Works without JavaScript through `useActionState`.
 *
 * @param previous - Previous state (only its save count is carried over).
 * @param formData - Submitted form.
 * @returns The new form state.
 * @see specs/003-account-orders/spec.md US4, FR-028
 */
export async function updateProfile(
  previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const values = readProfileForm(formData);
  const parsed = ProfileUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: ProfileStatus.ERROR,
      values,
      saveCount: previous.saveCount,
      fieldErrors: toProfileFieldErrors(parsed.error),
      formError: PROFILE_MESSAGES.errors.form,
    };
  }
  try {
    await updateMe(parsed.data, await getAccessTokenOrThrow());
  } catch (error) {
    return toProfileFailure(error, values, previous.saveCount);
  }
  revalidatePath(ACCOUNT_PATHS.profile);
  revalidatePath(CHECKOUT_PATH);
  return {
    status: ProfileStatus.SUCCESS,
    values: savedValues(values),
    fieldErrors: {},
    saveCount: previous.saveCount + 1,
  };
}

/**
 * Failure of a card request, from anything thrown while reading the token or calling the
 * backend.
 *
 * @param error - Thrown value.
 * @returns What the form shows.
 */
function toCardFailure(error: unknown): CardFailure {
  return error instanceof ApiError
    ? cardFailure(error.frontCode, error.retryAfterSeconds)
    : cardFailure(FrontErrorCode.UNKNOWN);
}

/**
 * Updates the holder name and the expiry of the saved card (`PUT /bank-card/update`). The
 * number is write-once on the backend: changing it means replacing the card. An expired session
 * keeps the typed values and invites to sign in again (FR-002); nothing about the card is
 * stored in the browser.
 *
 * @param _previous - Previous state (unused: each submission is complete).
 * @param formData - Submitted form (holder, expiry month and year).
 * @returns The new form state.
 * @see specs/003-account-orders/spec.md US5, FR-031
 */
export async function updateBankCard(
  _previous: CardUpdateState,
  formData: FormData,
): Promise<CardUpdateState> {
  const values = readCardUpdateForm(formData);
  const fieldErrors = validateCardUpdate(values, new Date());
  const update = toCardUpdate(values);
  if (Object.keys(fieldErrors).length > 0 || update === null) {
    return {
      status: CardFormStatus.ERROR,
      values,
      fieldErrors,
      formError: CARD_MESSAGES.errors.form,
    };
  }
  try {
    await updateSavedCard(update, await getAccessTokenOrThrow());
  } catch (error) {
    const failure = toCardFailure(error);
    return {
      status: CardFormStatus.ERROR,
      values,
      ...failure,
      fieldErrors: failure.fieldErrors ?? {},
    };
  }
  revalidatePath(ACCOUNT_PATHS.card);
  revalidatePath(CHECKOUT_PATH);
  return { status: CardFormStatus.SUCCESS, values, fieldErrors: {} };
}

/**
 * Deletes the saved card after the confirmation dialog (`DELETE /bank-card/delete`); a card
 * already gone counts as deleted. The card is read again afterwards: the backend can answer
 * `204` and still keep it (backend prompt 12), which is then said instead of a false success.
 *
 * @returns The new state: success, or the reason of the failure.
 * @see specs/003-account-orders/spec.md US5 scenario 3
 */
export async function deleteBankCard(): Promise<CardDeleteState> {
  try {
    const accessToken = await getAccessTokenOrThrow();
    await deleteSavedCard(accessToken);
    if ((await getBankCard(accessToken)) !== null) {
      return { status: CardFormStatus.ERROR, formError: CARD_MESSAGES.errors.deleteNotApplied };
    }
  } catch (error) {
    return { status: CardFormStatus.ERROR, ...toCardFailure(error) };
  }
  revalidatePath(ACCOUNT_PATHS.card);
  revalidatePath(CHECKOUT_PATH);
  return { status: CardFormStatus.SUCCESS };
}
