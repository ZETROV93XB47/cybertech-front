/**
 * Enums of the promotions (feature 004 US3 and US4).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §1
 */

/**
 * Campaign keys with a dedicated photo in `public/images/promotions/`.
 *
 * Campaign keys are free text on the backend; these four are the ones `DiscountTypeResolver`
 * knows (backend). Any other campaign gets the generic photo.
 */
export enum CampaignImageKey {
  BLACK_FRIDAY = "BLACK_FRIDAY",
  WINTER_SALES = "WINTER_SALES",
  SPRING_SALES = "SPRING_SALES",
  BUY_ONE_GET_ONE_FREE = "BUY_ONE_GET_ONE_FREE",
}

/**
 * Result of « Appliquer à mon panier » on a campaign page.
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §4
 */
export enum ApplyCampaignOutcome {
  /** Signed in: the key is preselected for the cart and the checkout. */
  APPLIED = "applied",
  /** Visitor: the key is kept for the tab, discounts need an account. */
  SIGN_IN_NEEDED = "sign-in-needed",
  /** The browser refuses `sessionStorage` (strict private browsing). */
  STORAGE_UNAVAILABLE = "storage-unavailable",
}
