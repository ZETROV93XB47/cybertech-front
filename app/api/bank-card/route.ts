/**
 * `/api/bank-card` — saves the test card typed in « Ajouter une carte » (USER).
 *
 * The body is validated by a strict schema before any backend call; the number is never logged,
 * cached nor sent back: the answer only holds the masked card. One card per account:
 * - without `replace`, the card is added (`POST /bank-card/add`); an existing card gives
 *   `409 conflict` (`BANK_CARD_ALREADY_EXISTS`);
 * - with `replace` (confirmed by the customer), the card is swapped in one backend transaction
 *   (`PUT /bank-card/replace`): a failure keeps the previous card, and the error says `cardKept`
 *   so that the page can tell it.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2 bis
 * @see specs/003-account-orders/research.md R21
 * @see BankCardManagementController#addBankCard, #replaceBankCard (backend)
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { addBankCard, replaceBankCard } from "@/lib/api/endpoints/bank-card";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { createModuleLogger } from "@/lib/logger";
import {
  BankCardAddBodySchema,
  type AddedCard,
  type BankCard,
  type BankCardAddBody,
} from "@/lib/schemas/bank-card";

const log = createModuleLogger("account.card");

/**
 * Keeps only what the browser may see of a saved card.
 *
 * @param saved - Masked card answered by the backend.
 * @returns The masked number, the expiry and the network.
 */
function toAddedCard(saved: BankCard): AddedCard {
  return {
    maskedNumber: saved.maskedNumber,
    expiryDate: saved.expiryDate,
    cardType: saved.cardType,
  };
}

/**
 * Adds or replaces the card.
 *
 * @param body - Validated body; the number is never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns `201` with the masked card, or the error (`cardKept` when a replacement failed).
 */
async function saveCard(body: BankCardAddBody, accessToken: string): Promise<NextResponse> {
  const { replace = false, ...card } = body;
  if (!replace) {
    return jsonOk(toAddedCard(await addBankCard(card, accessToken)), HTTP_STATUS.CREATED);
  }
  try {
    return jsonOk(toAddedCard(await replaceBankCard(card, accessToken)), HTTP_STATUS.CREATED);
  } catch (error) {
    log.warn({ cardType: card.cardType }, "Card replacement failed: previous card kept");
    return jsonError(error, { cardKept: true });
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
    return await saveCard(body.data, await getAccessTokenOrThrow());
  } catch (error) {
    return jsonError(error);
  }
}
