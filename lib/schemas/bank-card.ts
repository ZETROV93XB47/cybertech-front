/**
 * Saved bank card of the signed-in user (`BankCardResponseDto` from `GET /bank-card/get`).
 *
 * The backend only ever returns a masked number (`"**** **** **** 4242"`); the front never sees,
 * sends nor logs a full card number (constitution V).
 *
 * @see specs/003-account-orders/data-model.md §2.6
 * @see docs/backend/api-map.md §8, D.21
 */
import { z } from "zod";

import { CARD_EXPIRY_PATTERN } from "@/lib/constants/account";
import { BankCardType } from "@/lib/enums/bank-card";

/** `BankCardResponseDto`. */
export const BankCardSchema = z.object({
  uuid: z.uuid(),
  /** Not shown in the checkout; may be empty for a card added through Stripe. */
  cardHolderName: z.string().nullable(),
  /** Masked number, never the full one. */
  maskedNumber: z.string().min(1),
  /** `MM/YYYY`. */
  expiryDate: z.string().regex(CARD_EXPIRY_PATTERN).nullable(),
  cardType: z.enum(BankCardType),
});

/** Saved card, masked. */
export type BankCard = z.infer<typeof BankCardSchema>;
