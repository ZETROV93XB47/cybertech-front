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
