/**
 * Saved bank card of the signed-in user: read, add, update (holder and expiry) and delete.
 * Never cached: private data.
 *
 * Logs carry the network and the outcome only: never the number (not even masked), its last
 * digits, the holder nor the expiry (constitution V v3.0.0, contracts §5).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2, §2 bis, §3, §5
 * @see docs/backend/api-map.md §8
 * @see BankCardManagementController (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { createModuleLogger } from "@/lib/logger";
import {
  BankCardSchema,
  type BankCard,
  type BankCardCreation,
  type BankCardUpdate,
} from "@/lib/schemas/bank-card";

const log = createModuleLogger("account.card");

/**
 * Whether an error means « no saved card » (`404 BANK_CARD_NOT_FOUND`).
 *
 * @param error - Thrown value.
 * @returns `true` for the missing-card error.
 */
function isNoCard(error: unknown): boolean {
  return error instanceof ApiError && error.frontCode === FrontErrorCode.NO_SAVED_CARD;
}

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
    if (isNoCard(error)) {
      log.info("No saved card");
      return null;
    }
    throw error;
  }
}

/**
 * Saves a card (`POST /bank-card/add`). The backend refuses a second card
 * (`409 BANK_CARD_ALREADY_EXISTS`): use {@link replaceBankCard} instead.
 *
 * @param card - Validated card, number without spaces; never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The masked card.
 * @throws {ApiError} `INVALID`, `CARD_EXPIRED`, `CONFLICT`, `UNAUTHENTICATED` or `UNAVAILABLE`.
 */
export async function addBankCard(card: BankCardCreation, accessToken: string): Promise<BankCard> {
  const saved = await backendFetch(BACKEND_PATHS.bankCardAdd, {
    method: HttpMethod.POST,
    schema: BankCardSchema,
    body: card,
    accessToken,
  });
  log.info({ cardType: saved.cardType }, "Card saved");
  return saved;
}

/**
 * Replaces the saved card, or adds one when none is saved (`PUT /bank-card/replace`). The
 * backend validates the new card first and swaps both in one transaction: on any failure the
 * previous card is kept, so the account is never left without a card.
 *
 * @param card - Validated card, number without spaces; never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The masked new card.
 * @throws {ApiError} `INVALID`, `CARD_EXPIRED`, `UNAUTHENTICATED` or `UNAVAILABLE`.
 * @see BankCardManagementServiceImp#replaceBankCard (backend)
 */
export async function replaceBankCard(
  card: BankCardCreation,
  accessToken: string,
): Promise<BankCard> {
  const saved = await backendFetch(BACKEND_PATHS.bankCardReplace, {
    method: HttpMethod.PUT,
    schema: BankCardSchema,
    body: card,
    accessToken,
  });
  log.info({ cardType: saved.cardType }, "Card replaced");
  return saved;
}

/**
 * Updates the holder name and the expiry of the saved card (`PUT /bank-card/update`).
 *
 * @param update - Validated holder and expiry; never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The masked card.
 * @throws {ApiError} `CARD_EXPIRED`, `NO_SAVED_CARD`, `INVALID`, `UNAUTHENTICATED` or
 *   `UNAVAILABLE`.
 */
export async function updateBankCard(
  update: BankCardUpdate,
  accessToken: string,
): Promise<BankCard> {
  const saved = await backendFetch(BACKEND_PATHS.bankCardUpdate, {
    method: HttpMethod.PUT,
    schema: BankCardSchema,
    body: update,
    accessToken,
  });
  log.info({ cardType: saved.cardType }, "Card updated");
  return saved;
}

/**
 * Deletes the saved card (`DELETE /bank-card/delete`). An already missing card counts as
 * deleted.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns `true` when a card was deleted, `false` when there was none.
 * @throws {ApiError} `UNAUTHENTICATED` or `UNAVAILABLE`.
 */
export async function deleteBankCard(accessToken: string): Promise<boolean> {
  try {
    await backendFetch(BACKEND_PATHS.bankCardDelete, {
      method: HttpMethod.DELETE,
      schema: z.undefined(),
      accessToken,
    });
  } catch (error) {
    if (isNoCard(error)) {
      log.info("No card to delete");
      return false;
    }
    throw error;
  }
  log.info("Card deleted");
  return true;
}
