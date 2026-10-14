/**
 * Wishlist constants.
 *
 * Values are aligned with the backend (`CyberTechAppConstants.java`, `application.properties`);
 * never hard-code them elsewhere.
 *
 * @see specs/003-account-orders/research.md R22
 * @see docs/backend/api-map.md §9
 */

/**
 * Products per page of « Ma wishlist ».
 *
 * @see CyberTechAppConstants#DEFAULT_PAGE_SIZE_WISHLIST (backend)
 */
export const WISHLIST_PAGE_SIZE = 20;

/**
 * Most product UUIDs read to colour the hearts: one page at the largest size the backend
 * accepts. Beyond it a heart may show empty by mistake; adding stays correct (409 absorbed).
 *
 * @see application.properties `spring.data.web.pageable.max-page-size` (backend)
 */
export const WISHLIST_IDS_MAX = 100;

/** Sort of the wishlist: newest first, as the backend default. */
export const WISHLIST_SORT = "createdAt,desc";

/** Query parameter of the 1-based page of « Ma wishlist ». */
export const WISHLIST_PAGE_PARAM = "page";
