/**
 * Order constants: payment polling, timeline, list paging and edit limits.
 *
 * @see specs/003-account-orders/data-model.md §5 and §6
 * @see specs/003-account-orders/research.md R11–R14
 */
import { OrderStatus } from "@/lib/enums/order";

/**
 * Interval between two status reads on the confirmation page.
 *
 * `POST /order/place` never answers 402: the payment outcome is only visible in the status
 * (api-map §E 26). Two seconds keeps SC-005 (outcome shown within 15 s in 95 % of cases) while
 * staying far below the backend rate limits.
 */
export const ORDER_STATUS_POLL_INTERVAL_MS = 2_000;

/**
 * Longest time the confirmation page polls before pointing to the order detail (spec
 * assumption « de l'ordre d'une minute »).
 */
export const ORDER_STATUS_POLL_TIMEOUT_MS = 60_000;

/**
 * Statuses that end the polling of the confirmation page: every status once the payment
 * attempt is over (only `CREATED` and `AWAITING_PAYMENT` keep it going).
 */
export const CONFIRMATION_TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(
  Object.values(OrderStatus).filter(
    (status) => status !== OrderStatus.CREATED && status !== OrderStatus.AWAITING_PAYMENT,
  ),
);

/** Nominal steps of the order timeline, in order (FR-024); outcomes are shown apart. */
export const ORDER_TIMELINE_STEPS: readonly OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.AWAITING_SHIPPING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/** Orders per page of « Mes commandes » (backend default is 20; 10 keeps the page short). */
export const ORDERS_PAGE_SIZE = 10;

/** Sort of « Mes commandes »: newest first (api-map §7, `createdAt,desc`). */
export const ORDERS_SORT = "createdAt,desc";

/** Largest number of lines of an edited order, aligned with `GUEST_CART_MAX_LINES`. */
export const ORDER_MAX_LINES = 50;

/** Delay before the product search of the order edit form fires. */
export const ORDER_EDIT_SEARCH_DEBOUNCE_MS = 300;

/** Results proposed by the product search of the order edit form. */
export const ORDER_EDIT_SEARCH_SIZE = 8;
