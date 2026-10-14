import "server-only";

/**
 * Data of the checkout page, read on the server in parallel: the profile address to prefill,
 * whether the server cart has lines, the shipping choices with their real prices, the saved card
 * that will be charged and the active discount campaigns.
 *
 * @see specs/003-account-orders/research.md R3, R7, R21
 * @see specs/003-account-orders/contracts/bff-routes.md §3
 */
import { parseFlatAddress, type ParsedAddress } from "@/lib/address";
import { ApiError } from "@/lib/api/errors";
import { getBankCard } from "@/lib/api/endpoints/bank-card";
import { getAccountCart } from "@/lib/api/endpoints/cart";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { getShippingOptions } from "@/lib/api/endpoints/shipping";
import { getProfile } from "@/lib/api/endpoints/users";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { toSavedCard, UNKNOWN_SAVED_CARD, type SavedCard } from "../saved-card";
import { buildShippingChoices, type ShippingChoice } from "../shipping-choices";

const log = createModuleLogger("checkout.page");

/** What the checkout page needs before rendering. */
export interface CheckoutData {
  /** Address of the profile, split into fields (empty fields when unknown). */
  readonly address: ParsedAddress;
  /** Whether the server cart holds at least one line. */
  readonly hasLines: boolean;
  /** Shipping choices; empty when the options could not be read. */
  readonly choices: readonly ShippingChoice[];
  /** Card that will be charged, its absence, or unknown when it could not be read. */
  readonly savedCard: SavedCard;
  /** Displayable discount campaigns; empty when they could not be read. */
  readonly campaigns: readonly ActiveDiscount[];
}

/**
 * Error code of a failed optional read, for the log.
 *
 * @param error - Thrown value.
 * @returns The front error code.
 */
function codeOf(error: unknown): FrontErrorCode {
  return error instanceof ApiError ? error.frontCode : FrontErrorCode.UNKNOWN;
}

/**
 * Reads the saved card; an outage leaves the placement to the backend instead of blocking it.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The saved card view.
 */
async function readSavedCard(accessToken: string): Promise<SavedCard> {
  try {
    return toSavedCard(await getBankCard(accessToken));
  } catch (error) {
    log.warn({ code: codeOf(error) }, "Saved card unreadable, placement left to the backend");
    return UNKNOWN_SAVED_CARD;
  }
}

/**
 * Reads the discount campaigns; an outage only leaves the key field.
 *
 * @returns The campaigns, or an empty list.
 */
async function readCampaigns(): Promise<ActiveDiscount[]> {
  try {
    return await getActiveDiscounts();
  } catch (error) {
    log.warn({ code: codeOf(error) }, "Discount campaigns unavailable, key field only");
    return [];
  }
}

/**
 * Reads the profile address; a missing profile or address leaves the fields to type.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The split address.
 * @throws {ApiError} `UNAUTHENTICATED` or `UNAVAILABLE`, rethrown to the page.
 */
async function readAddress(accessToken: string): Promise<ParsedAddress> {
  try {
    return parseFlatAddress((await getProfile(accessToken)).address);
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      log.warn("Profile not found, address left empty");
      return parseFlatAddress(null);
    }
    throw error;
  }
}

/**
 * Loads the checkout data.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @param now - Current time, for the express promise.
 * @returns The data of the page.
 * @throws {ApiError} When the cart or the profile cannot be read.
 */
export async function loadCheckoutData(accessToken: string, now: Date): Promise<CheckoutData> {
  const [address, cart, options, savedCard, campaigns] = await Promise.all([
    readAddress(accessToken),
    getAccountCart(accessToken),
    getShippingOptions(),
    readSavedCard(accessToken),
    readCampaigns(),
  ]);
  return {
    address,
    hasLines: (cart.items ?? []).length > 0,
    choices: buildShippingChoices(options, now),
    savedCard,
    campaigns,
  };
}
