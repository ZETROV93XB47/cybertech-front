/**
 * Address of « Mes commandes »: the status filter and the page live in the query string, so a
 * filtered list can be shared, reloaded and navigated with the back button (FR-022).
 *
 * @see specs/003-account-orders/research.md R12
 */
import { ORDERS_PAGE_PARAM, ORDERS_STATUS_PARAM } from "@/lib/constants/orders";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";
import type { OrderStatus } from "@/lib/enums/order";
import { OrdersListParamsSchema, type OrdersListParams } from "@/lib/schemas/order";

/** First page of the list (1-based). */
const FIRST_PAGE = 1;

/** Query string as Next.js hands it to a page. */
export type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Reads the filter and the page of the list from the query string; unknown statuses and an
 * invalid page are dropped, never an error.
 *
 * @param searchParams - Query string of the page.
 * @returns The validated parameters.
 */
export function readOrdersListParams(searchParams: RawSearchParams): OrdersListParams {
  const statuses = searchParams[ORDERS_STATUS_PARAM];
  return OrdersListParamsSchema.parse({
    statuses: statuses === undefined ? [] : [statuses].flat(),
    page: searchParams[ORDERS_PAGE_PARAM],
  });
}

/**
 * Builds the address of a page of the list.
 *
 * @param statuses - Status filter (empty for every order).
 * @param page - 1-based page.
 * @returns The path with its query string.
 */
export function ordersListPath(
  statuses: readonly OrderStatus[],
  page: number = FIRST_PAGE,
): string {
  const query = new URLSearchParams();
  statuses.forEach((status) => {
    query.append(ORDERS_STATUS_PARAM, status);
  });
  if (page > FIRST_PAGE) {
    query.set(ORDERS_PAGE_PARAM, String(page));
  }
  const search = query.toString();
  return search === "" ? ACCOUNT_PATHS.orders : `${ACCOUNT_PATHS.orders}?${search}`;
}
