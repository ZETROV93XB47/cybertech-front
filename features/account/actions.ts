"use server";

/**
 * Server Actions of the account area (feature 003): profile update (US4); the saved-card
 * actions join them in US5.
 *
 * Each action validates with the same Zod schema as the form, reads the user's token on the
 * server and never logs a field value (contracts §5).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 * @see specs/003-account-orders/research.md R17
 */
import { revalidatePath } from "next/cache";

import { updateMe } from "@/lib/api/endpoints/users";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { ACCOUNT_PATHS, CHECKOUT_PATH } from "@/lib/constants/routes";
import { ProfileStatus } from "@/lib/enums/profile";
import { ProfileUpdateSchema, readProfileForm, toProfileFieldErrors } from "@/lib/schemas/user";

import { PROFILE_MESSAGES } from "./messages";
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
