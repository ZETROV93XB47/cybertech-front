/**
 * Closed sets of « Mon profil » (feature 003 US4): the editable fields and the outcome of the
 * profile Server Action.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 * @see UserSelfUpdateRequestDto (backend)
 */

/**
 * One editable field of the profile form. The values are the field names of the backend
 * `UserSelfUpdateRequestDto`, so backend `fieldErrors` map onto the form without translation.
 */
export enum ProfileField {
  FIRST_NAME = "firstName",
  LAST_NAME = "lastName",
  /** Write-only: the backend never returns it, a typed number replaces the stored one. */
  PHONE_NUMBER = "phoneNumber",
  STREET = "street",
  ZIP_CODE = "zipCode",
  CITY = "city",
  COUNTRY = "country",
}

/** State of the profile form, as kept by `useActionState`. */
export enum ProfileStatus {
  /** Nothing submitted yet. */
  IDLE = "idle",
  /** Profile saved: the confirmation is announced. */
  SUCCESS = "success",
  /** Refused: field errors and/or a form error to show. */
  ERROR = "error",
}
