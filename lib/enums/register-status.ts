/**
 * Outcome of the registration Server Action, as kept by `useActionState`.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md (Server Actions)
 */

/** State of the registration form. */
export enum RegisterStatus {
  /** Nothing submitted yet. */
  IDLE = "idle",
  /** Account created: the visitor is invited to sign in (FR-014). */
  SUCCESS = "success",
  /** Refused: field errors and/or a form error to show. */
  ERROR = "error",
}
