/**
 * Discount constants.
 *
 * @see specs/003-account-orders/data-model.md §3 and §6
 * @see docs/backend/api-map.md §5
 */

/**
 * Key of the « no discount » campaign, the backend default of `discountKey`.
 *
 * @see CyberTechAppConstants.java:39 (backend)
 */
export const NO_DISCOUNT_KEY = "NO_DISCOUNT";

/**
 * Longest discount key accepted from the user. Front guard only: the backend has no length
 * constraint and its keys are at most 25 characters today (`DiscountCampaignInitializer`).
 */
export const DISCOUNT_KEY_MAX_LENGTH = 64;

/** Shape of a discount key once upper-cased: letters, digits and underscores. */
export const DISCOUNT_KEY_PATTERN = /^[A-Z0-9_]+$/;
