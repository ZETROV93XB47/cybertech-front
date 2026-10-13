/**
 * Merge of the guest cart into the account cart, once, right after sign-in.
 *
 * @see docs/guest-cart.md §4
 * @see CartServiceImp#addItemsToCart (backend)
 */
import "server-only";

import { ApiError } from "@/lib/api/errors";
import { addToCart, getAccountCart } from "@/lib/api/endpoints/cart";
import { getAvailability } from "@/lib/api/endpoints/products";
import { MergeDropReason } from "@/lib/enums/cart";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { maskUuid } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import type { AccountCart, GuestLine, MergeReport } from "@/lib/schemas/cart";

import { orderableStock } from "../cart-view";

import { toAccountCartView } from "./cart-view";

const log = createModuleLogger("cart.merge");

/** Merge report without the final cart view, filled line by line. */
type MergeOutcome = Omit<MergeReport, "cart">;

/** State of the line-by-line replay. */
interface ReplayContext {
  readonly accessToken: string;
  /** Units that can still be added, per product (stock minus what the account cart holds). */
  readonly addable: ReadonlyMap<string, number>;
  readonly outcome: MergeOutcome;
  /** Last cart returned by the backend. */
  cart: AccountCart;
}

/**
 * Tells whether a failed batch should be replayed line by line.
 *
 * @param error - Error of the batched add.
 * @returns `true` for a stock problem or an unknown product: one line must not block the others.
 */
function needsLineByLine(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.frontCode === FrontErrorCode.INSUFFICIENT_STOCK ||
      error.frontCode === FrontErrorCode.NOT_FOUND)
  );
}

/**
 * Units of each product that can still be added to the account cart.
 *
 * The backend add is additive and checks `existing + added` against the stock, so the quantity
 * already in the account cart is subtracted. Unknown products are absent from the map.
 *
 * @param lines - Guest lines.
 * @param cart - Current account cart.
 * @returns Addable units by product UUID.
 * @throws {ApiError} When the backend is unavailable.
 */
async function readAddableUnits(
  lines: readonly GuestLine[],
  cart: AccountCart,
): Promise<Map<string, number>> {
  const availability = await getAvailability(lines.map((line) => line.productUuid));
  const inCart = new Map((cart.items ?? []).map((item) => [item.productUuid, item.quantity]));
  return new Map(
    availability.map((item) => [
      item.productUuid,
      Math.max(0, (orderableStock(item) ?? 0) - (inCart.get(item.productUuid) ?? 0)),
    ]),
  );
}

/**
 * Records a line rejected by the backend during the replay.
 *
 * @param context - Replay state.
 * @param line - The rejected line.
 * @param error - Backend error.
 */
function recordLineFailure(context: ReplayContext, line: GuestLine, error: unknown): void {
  const code = error instanceof ApiError ? error.frontCode : FrontErrorCode.UNKNOWN;
  if (code === FrontErrorCode.NOT_FOUND) {
    context.outcome.dropped.push({
      productUuid: line.productUuid,
      reason: MergeDropReason.NOT_FOUND,
    });
  } else if (code === FrontErrorCode.INSUFFICIENT_STOCK) {
    context.outcome.dropped.push({
      productUuid: line.productUuid,
      reason: MergeDropReason.OUT_OF_STOCK,
    });
  } else {
    context.outcome.failed.push(line);
  }
}

/**
 * Adds one guest line with its quantity capped to the addable stock.
 *
 * @param context - Replay state, updated in place.
 * @param line - Guest line.
 * @returns A promise resolved once the line is classified.
 */
async function replayLine(context: ReplayContext, line: GuestLine): Promise<void> {
  const addable = context.addable.get(line.productUuid);
  if (addable === undefined) {
    context.outcome.dropped.push({
      productUuid: line.productUuid,
      reason: MergeDropReason.NOT_FOUND,
    });
    return;
  }
  const quantity = Math.min(line.quantity, addable);
  if (quantity <= 0) {
    context.outcome.dropped.push({
      productUuid: line.productUuid,
      reason: MergeDropReason.OUT_OF_STOCK,
    });
    return;
  }
  try {
    context.cart = await addToCart(
      [{ productUuid: line.productUuid, quantity }],
      context.accessToken,
    );
  } catch (error) {
    recordLineFailure(context, line, error);
    return;
  }
  if (quantity === line.quantity) {
    context.outcome.merged.push(line.productUuid);
    return;
  }
  context.outcome.capped.push({
    productUuid: line.productUuid,
    requested: line.quantity,
    added: quantity,
  });
  log.warn(
    { productUuid: maskUuid(line.productUuid), requested: line.quantity, added: quantity },
    "Guest line capped to the available stock",
  );
}

/**
 * Replays the guest lines one by one, in order (the backend serialises cart writes anyway).
 *
 * @param lines - Guest lines.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The outcome and the last cart returned by the backend.
 * @throws {ApiError} When the account cart or the stock cannot be read.
 */
async function replayLineByLine(
  lines: readonly GuestLine[],
  accessToken: string,
): Promise<{ outcome: MergeOutcome; cart: AccountCart }> {
  const cart = await getAccountCart(accessToken);
  const context: ReplayContext = {
    accessToken,
    addable: await readAddableUnits(lines, cart),
    outcome: { merged: [], capped: [], dropped: [], failed: [] },
    cart,
  };
  for (const line of lines) {
    await replayLine(context, line);
  }
  return { outcome: context.outcome, cart: context.cart };
}

/**
 * Merges the guest cart into the account cart, exactly once, right after sign-in.
 *
 * First tries a single batched `POST /cart/add` (additive on the backend side). On
 * `NOT_ENOUGH_STOCK` or an unknown product, replays line by line with quantities capped to the
 * available stock, so that one problematic line does not reject the whole merge.
 *
 * @param lines - Guest lines, already validated by Zod.
 * @param accessToken - The user's Keycloak access token; never logged.
 * @returns The merge report (merged, capped, dropped and failed lines) and the account cart.
 * @throws {ApiError} When the backend is still unavailable after the single retry, or the
 * session is no longer valid.
 * @see docs/guest-cart.md §4
 */
export async function mergeGuestCart(
  lines: readonly GuestLine[],
  accessToken: string,
): Promise<MergeReport> {
  if (lines.length === 0) {
    const cart = await toAccountCartView(await getAccountCart(accessToken));
    return { cart, merged: [], capped: [], dropped: [], failed: [] };
  }
  let result: { outcome: MergeOutcome; cart: AccountCart };
  try {
    const cart = await addToCart(lines, accessToken);
    const merged = lines.map((line) => line.productUuid);
    result = { outcome: { merged, capped: [], dropped: [], failed: [] }, cart };
  } catch (error) {
    if (!needsLineByLine(error)) {
      throw error;
    }
    result = await replayLineByLine(lines, accessToken);
  }
  const { outcome } = result;
  log.info(
    {
      merged: outcome.merged.length,
      capped: outcome.capped.length,
      dropped: outcome.dropped.length,
      failed: outcome.failed.length,
    },
    "Guest cart merged",
  );
  return { ...outcome, cart: await toAccountCartView(result.cart) };
}
