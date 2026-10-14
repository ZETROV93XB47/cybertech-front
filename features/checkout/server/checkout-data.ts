import "server-only";

/**
 * Data of the checkout page, read on the server in parallel: the profile address to prefill,
 * whether the server cart has lines, and the shipping choices with their real prices.
 *
 * @see specs/003-account-orders/research.md R3
 * @see specs/003-account-orders/contracts/bff-routes.md §3
 */
import { parseFlatAddress, type ParsedAddress } from "@/lib/address";
import { ApiError } from "@/lib/api/errors";
import { getAccountCart } from "@/lib/api/endpoints/cart";
import { getShippingOptions } from "@/lib/api/endpoints/shipping";
import { getProfile } from "@/lib/api/endpoints/users";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";

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
  const [address, cart, options] = await Promise.all([
    readAddress(accessToken),
    getAccountCart(accessToken),
    getShippingOptions(),
  ]);
  return {
    address,
    hasLines: (cart.items ?? []).length > 0,
    choices: buildShippingChoices(options, now),
  };
}
