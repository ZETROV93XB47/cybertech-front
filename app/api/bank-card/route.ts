/**
 * `/api/bank-card` — saves the test card typed in « Ajouter une carte » (USER).
 *
 * The body is validated by a strict schema before any backend call; the number is never logged,
 * cached nor sent back: the answer only holds the masked card. The backend refuses a second
 * card, so:
 * - without `replace`, an existing card gives `409 conflict` (checked first: the backend would
 *   answer a bare 500);
 * - with `replace` (confirmed by the customer), the current card is deleted, then the new one
 *   is added; if the add fails after the delete, the error says `cardRemoved` so that the page
 *   explains it and asks to type the card again — never a silent loss (decision of 2026-10-20).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2 bis
 * @see specs/003-account-orders/research.md R21
 * @see BankCardManagementController#addBankCard (backend)
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { addBankCard, deleteBankCard, getBankCard } from "@/lib/api/endpoints/bank-card";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";
import {
  BankCardAddBodySchema,
  type AddedCard,
  type BankCardAddBody,
} from "@/lib/schemas/bank-card";

const log = createModuleLogger("account.card");

/** Technical message of an add refused because a card is already saved. */
const CARD_EXISTS_MESSAGE = "A card is already saved: replace it";

/** Message of a deletion acknowledged by the backend that left the card in place. */
const CARD_NOT_DELETED_MESSAGE = "The saved card is still there after its deletion";

/**
 * Deletes the current card and checks that it is really gone: the backend can answer `204` and
 * still keep the card (backend prompt 12), in which case the replacement stops here.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns Whether a card was deleted (`false` when there was none).
 * @throws {ApiError} `CONFLICT` when the card is still saved after its deletion.
 */
async function deleteForReplacement(accessToken: string): Promise<boolean> {
  const deleted = await deleteBankCard(accessToken);
  if ((await getBankCard(accessToken)) !== null) {
    throw new ApiError({
      status: HTTP_STATUS.CONFLICT,
      frontCode: FrontErrorCode.CONFLICT,
      message: CARD_NOT_DELETED_MESSAGE,
    });
  }
  return deleted;
}

/**
 * Makes room for the new card: deletes the current one when replacing, otherwise refuses when
 * one exists.
 *
 * @param replace - Whether the customer confirmed the replacement.
 * @param accessToken - Keycloak access token; never logged.
 * @returns Whether a card was deleted.
 * @throws {ApiError} `CONFLICT` when a card exists and no replacement was asked, or when the
 *   deletion of the current card did not take effect.
 */
async function makeRoom(replace: boolean, accessToken: string): Promise<boolean> {
  if (replace) {
    return deleteForReplacement(accessToken);
  }
  if ((await getBankCard(accessToken)) !== null) {
    throw new ApiError({
      status: HTTP_STATUS.CONFLICT,
      frontCode: FrontErrorCode.CONFLICT,
      message: CARD_EXISTS_MESSAGE,
    });
  }
  return false;
}

/**
 * Adds the card once there is room for it.
 *
 * @param body - Validated body; the number is never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns `201` with the masked card, or the error (`cardRemoved` when a replacement lost the
 *   previous card).
 */
async function addCard(body: BankCardAddBody, accessToken: string): Promise<NextResponse> {
  const { replace = false, ...card } = body;
  let removed: boolean;
  try {
    removed = await makeRoom(replace, accessToken);
  } catch (error) {
    if (replace && error instanceof ApiError && error.message === CARD_NOT_DELETED_MESSAGE) {
      log.warn({ cardType: card.cardType }, "Card replacement stopped: old card not deleted");
      return jsonError(error, { cardKept: true });
    }
    throw error;
  }
  try {
    const saved = await addBankCard(card, accessToken);
    const answer: AddedCard = {
      maskedNumber: saved.maskedNumber,
      expiryDate: saved.expiryDate,
      cardType: saved.cardType,
    };
    return jsonOk(answer, HTTP_STATUS.CREATED);
  } catch (error) {
    if (removed) {
      log.warn(
        { cardType: card.cardType },
        "Card replacement failed after the old card was deleted",
      );
      return jsonError(error, { cardRemoved: true });
    }
    throw error;
  }
}

/**
 * Saves the typed card.
 *
 * @param request - Request carrying holder, number, expiry, network and `replace`.
 * @returns `201 AddedCard`, or an error (`invalid`, `conflict`, `card-expired`,
 *   `unauthenticated`, `rate-limited`, `unavailable`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, BankCardAddBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    return await addCard(body.data, await getAccessTokenOrThrow());
  } catch (error) {
    return jsonError(error);
  }
}
