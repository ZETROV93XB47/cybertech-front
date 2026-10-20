/**
 * State of the order edit form as a pure reducer, and the body sent to the backend.
 *
 * `POST /order/update` replaces **all** the lines, so the body always carries the complete new
 * list; at least one line stays (emptying an order goes through its cancellation), a product
 * added twice gets its quantity increased, and the payment method must be chosen again since
 * the backend does not return it. No discount key is sent: the order keeps its own.
 *
 * @see specs/003-account-orders/spec.md FR-025
 * @see specs/003-account-orders/research.md R14
 */
import { validateAddress, type AddressErrors } from "@/features/checkout/address-form";
import type { ParsedAddress } from "@/lib/address";
import { assertNever } from "@/lib/assert-never";
import { CART_LINE_MAX_QUANTITY, CART_LINE_MIN_QUANTITY } from "@/lib/constants/cart";
import type { QuoteShipping } from "@/lib/constants/checkout";
import { ORDER_MAX_LINES } from "@/lib/constants/orders";
import type { AddressField } from "@/lib/enums/checkout-step-state";
import { OrderEditActionType, OrderEditIssue, type PaymentType } from "@/lib/enums/order";
import type { StockShortage } from "@/lib/schemas/error";
import type { OrderResponse, OrderUpdateBody } from "@/lib/schemas/order";
import type { OrderEditDraft } from "@/lib/schemas/storage";

/** One line of the edited order. */
export interface EditLine {
  readonly productUuid: string;
  readonly productName: string;
  readonly quantity: number;
  /** Unit price of a line added during the edit (catalog price); `null` for an existing line. */
  readonly unitPrice: number | null;
  /** Quantity in the saved order, `0` for a line added during the edit. */
  readonly originalQuantity: number;
}

/** A line flagged after a stock refusal. */
export interface StockFlag {
  readonly productUuid: string;
  /** What can still be ordered, from the backend details; `null` when the backend named no line. */
  readonly available: number | null;
}

/** State of the edit form. */
export interface OrderEditState {
  readonly lines: readonly EditLine[];
  readonly address: ParsedAddress;
  readonly addressErrors: AddressErrors;
  readonly shipping: QuoteShipping;
  readonly payment: PaymentType | null;
  /** Lines refused for lack of stock at the last save. */
  readonly stockFlagged: readonly StockFlag[];
}

/** Product picked in the search of the edit form. */
export interface PickedProduct {
  readonly productUuid: string;
  readonly productName: string;
  readonly unitPrice: number;
}

/** Transition of the edit form. */
export type OrderEditAction =
  | {
      readonly type: OrderEditActionType.SET_QUANTITY;
      readonly productUuid: string;
      readonly quantity: number;
    }
  | { readonly type: OrderEditActionType.REMOVE_LINE; readonly productUuid: string }
  | { readonly type: OrderEditActionType.ADD_PRODUCT; readonly product: PickedProduct }
  | {
      readonly type: OrderEditActionType.CHANGE_ADDRESS;
      readonly field: AddressField;
      readonly value: string;
    }
  | { readonly type: OrderEditActionType.SELECT_SHIPPING; readonly value: QuoteShipping }
  | { readonly type: OrderEditActionType.SELECT_PAYMENT; readonly value: PaymentType }
  | {
      readonly type: OrderEditActionType.FLAG_STOCK;
      /** Short lines named by the backend (`details.items`); absent or empty → fallback. */
      readonly shortages?: readonly StockShortage[] | undefined;
    }
  | { readonly type: OrderEditActionType.SET_ADDRESS_ERRORS; readonly errors: AddressErrors }
  | { readonly type: OrderEditActionType.RESTORE_DRAFT; readonly draft: OrderEditDraft };

/** Outcome of {@link buildOrderUpdateBody}. */
export type OrderUpdateBodyResult =
  | { readonly ok: true; readonly body: OrderUpdateBody }
  | {
      readonly ok: false;
      readonly issues: readonly OrderEditIssue[];
      readonly addressErrors: AddressErrors;
    };

/**
 * Bounds a quantity to the quantities the backend accepts on a line.
 *
 * @param quantity - Requested quantity.
 * @returns An integer between the minimum and the maximum line quantity.
 */
function clampQuantity(quantity: number): number {
  return Math.min(CART_LINE_MAX_QUANTITY, Math.max(CART_LINE_MIN_QUANTITY, Math.trunc(quantity)));
}

/**
 * Builds the first state from the saved order.
 *
 * @param order - Backend order.
 * @param address - Its address, split into fields.
 * @returns The initial state (no payment chosen: the backend does not return it).
 */
export function initOrderEditState(order: OrderResponse, address: ParsedAddress): OrderEditState {
  return {
    lines: order.orderItems.map((item) => ({
      productUuid: item.productUuid,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: null,
      originalQuantity: item.quantity,
    })),
    address,
    addressErrors: {},
    shipping: { type: order.shippingType, provider: order.shippingProvider },
    payment: null,
    stockFlagged: [],
  };
}

/**
 * Adds a product, or increases the quantity of its line when it is already there.
 *
 * @param state - Current state.
 * @param product - Picked product.
 * @returns The next state; unchanged when the line limit is reached.
 */
function addProduct(state: OrderEditState, product: PickedProduct): OrderEditState {
  const existing = state.lines.find((line) => line.productUuid === product.productUuid);
  if (existing !== undefined) {
    return setQuantity(state, product.productUuid, existing.quantity + CART_LINE_MIN_QUANTITY);
  }
  if (state.lines.length >= ORDER_MAX_LINES) {
    return state;
  }
  const line: EditLine = { ...product, quantity: CART_LINE_MIN_QUANTITY, originalQuantity: 0 };
  return { ...state, lines: [...state.lines, line] };
}

/**
 * Changes the quantity of a line.
 *
 * @param state - Current state.
 * @param productUuid - Product of the line.
 * @param quantity - New quantity, bounded.
 * @returns The next state.
 */
function setQuantity(state: OrderEditState, productUuid: string, quantity: number): OrderEditState {
  return {
    ...state,
    lines: state.lines.map((line) =>
      line.productUuid === productUuid ? { ...line, quantity: clampQuantity(quantity) } : line,
    ),
    stockFlagged: state.stockFlagged.filter((flag) => flag.productUuid !== productUuid),
  };
}

/**
 * Removes a line, unless it is the last one (FR-025).
 *
 * @param state - Current state.
 * @param productUuid - Product of the line.
 * @returns The next state.
 */
function removeLine(state: OrderEditState, productUuid: string): OrderEditState {
  if (state.lines.length <= 1) {
    return state;
  }
  return { ...state, lines: state.lines.filter((line) => line.productUuid !== productUuid) };
}

/**
 * Lines that ask for more stock than the saved order: the only ones a `NOT_ENOUGH_STOCK` can
 * be about when the backend does not name the short lines.
 *
 * @param lines - Edited lines.
 * @returns Their product UUIDs.
 */
export function linesNeedingStock(lines: readonly EditLine[]): string[] {
  return lines.filter((line) => line.quantity > line.originalQuantity).map((l) => l.productUuid);
}

/**
 * Lines to flag after a stock refusal: exactly the short lines named by the backend
 * (`details.items`, backend commit f582c3a), else every line asking for more than the saved
 * order, without a remaining quantity.
 *
 * @param lines - Edited lines.
 * @param shortages - Short lines sent by the backend, if any.
 * @returns The flags.
 * @see docs/backend/backend-prompts-lot2.md §11
 */
export function stockFlagsOf(
  lines: readonly EditLine[],
  shortages: readonly StockShortage[] | undefined,
): StockFlag[] {
  if (shortages !== undefined && shortages.length > 0) {
    return shortages.map(({ productUuid, available }) => ({ productUuid, available }));
  }
  return linesNeedingStock(lines).map((productUuid) => ({ productUuid, available: null }));
}

/**
 * Restores a draft kept across a forced re-login: lines, shipping and payment; the address
 * stays the one of the order.
 *
 * @param state - Initial state.
 * @param draft - Stored draft.
 * @returns The restored state.
 */
function restoreDraft(state: OrderEditState, draft: OrderEditDraft): OrderEditState {
  const saved = new Map(state.lines.map((line) => [line.productUuid, line.originalQuantity]));
  return {
    ...state,
    lines: draft.lines.map((line) => ({
      productUuid: line.productUuid,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      originalQuantity: saved.get(line.productUuid) ?? 0,
    })),
    shipping: { type: draft.shippingType, provider: draft.shippingProvider },
    payment: draft.paymentType ?? state.payment,
  };
}

/**
 * Order edit reducer.
 *
 * @param state - Current state.
 * @param action - Transition.
 * @returns The next state.
 */
export function orderEditReducer(state: OrderEditState, action: OrderEditAction): OrderEditState {
  switch (action.type) {
    case OrderEditActionType.SET_QUANTITY:
      return setQuantity(state, action.productUuid, action.quantity);
    case OrderEditActionType.REMOVE_LINE:
      return removeLine(state, action.productUuid);
    case OrderEditActionType.ADD_PRODUCT:
      return addProduct(state, action.product);
    case OrderEditActionType.CHANGE_ADDRESS:
      return {
        ...state,
        address: { ...state.address, [action.field]: action.value },
        addressErrors: { ...state.addressErrors, [action.field]: undefined },
      };
    case OrderEditActionType.SELECT_SHIPPING:
      return { ...state, shipping: action.value };
    case OrderEditActionType.SELECT_PAYMENT:
      return { ...state, payment: action.value };
    case OrderEditActionType.FLAG_STOCK:
      return { ...state, stockFlagged: stockFlagsOf(state.lines, action.shortages) };
    case OrderEditActionType.SET_ADDRESS_ERRORS:
      return { ...state, addressErrors: action.errors };
    case OrderEditActionType.RESTORE_DRAFT:
      return restoreDraft(state, action.draft);
    default:
      return assertNever(action);
  }
}

/**
 * Builds the body of `POST /api/orders/{uuid}` from the form.
 *
 * @param state - Edit state.
 * @returns The body, or the issues that keep it from being sent.
 */
export function buildOrderUpdateBody(state: OrderEditState): OrderUpdateBodyResult {
  const address = validateAddress(state.address);
  const issues: OrderEditIssue[] = [];
  if (!address.ok) {
    issues.push(OrderEditIssue.ADDRESS);
  }
  if (state.payment === null) {
    issues.push(OrderEditIssue.PAYMENT);
  }
  if (!address.ok || state.payment === null) {
    return { ok: false, issues, addressErrors: address.ok ? {} : address.errors };
  }
  return {
    ok: true,
    body: {
      paymentType: state.payment,
      shippingType: state.shipping.type,
      shippingProvider: state.shipping.provider,
      address: address.address,
      items: state.lines.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
    },
  };
}

/**
 * Draft kept in `sessionStorage` before a forced re-login: never the address.
 *
 * @param orderUuid - Edited order.
 * @param state - Edit state.
 * @returns The draft.
 */
export function toOrderEditDraft(orderUuid: string, state: OrderEditState): OrderEditDraft {
  return {
    orderUuid,
    lines: state.lines.map((line) => ({
      productUuid: line.productUuid,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      isAdded: line.originalQuantity === 0,
    })),
    shippingType: state.shipping.type,
    shippingProvider: state.shipping.provider,
    ...(state.payment === null ? {} : { paymentType: state.payment }),
  };
}
