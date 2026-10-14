/**
 * Saved bank card of the signed-in user (read part; update, delete and the Stripe flow come with
 * US5). Never cached: private data. Neither the holder name nor the masked number is logged.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §3, §5
 * @see docs/backend/api-map.md §8
 * @see BankCardManagementController#getBankCard (backend)
 */
import "server-only";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";
import { BankCardSchema, type BankCard } from "@/lib/schemas/bank-card";

const log = createModuleLogger("account.card");

/**
 * Reads the saved card of the signed-in user.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The masked card, or `null` when none is saved (`404 BANK_CARD_NOT_FOUND`).
 * @throws {ApiError} `UNAUTHENTICATED` or `UNAVAILABLE`.
 */
export async function getBankCard(accessToken: string): Promise<BankCard | null> {
  try {
    const card = await backendFetch(BACKEND_PATHS.bankCardGet, {
      schema: BankCardSchema,
      accessToken,
    });
    log.debug({ cardType: card.cardType }, "Saved card read");
    return card;
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NO_SAVED_CARD) {
      log.info("No saved card");
      return null;
    }
    throw error;
  }
}
