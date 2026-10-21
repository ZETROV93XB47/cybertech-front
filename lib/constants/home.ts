/**
 * Home page constants (feature 004, carousel).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §6
 */

/**
 * Most campaign slides in the home carousel.
 *
 * Keeps the carousel short if the backend activates many campaigns at once (spec 004,
 * assumptions); the « Promotions » page still lists them all.
 */
export const HOME_CAMPAIGN_SLIDES_MAX = 4;
