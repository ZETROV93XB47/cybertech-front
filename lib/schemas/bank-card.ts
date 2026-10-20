/**
 * Saved bank card of the signed-in user: the masked card read from `GET /bank-card/get`, the
 * holder and expiry update, and the body of « Ajouter une carte ».
 *
 * The backend only ever returns a masked number (`"**** **** **** 4242"`). The full number only
 * exists in the add body, on its way to the backend through the BFF: it is never logged, stored
 * nor sent back (constitution V v3.0.0). No security code is asked: the backend has none.
 *
 * @see specs/003-account-orders/data-model.md §2.6, §2.6 bis
 * @see docs/backend/api-map.md §8, D.21
 * @see BankCardCreationRequestDto, BankCardUpdateRequestDto (backend)
 */
import { z } from "zod";

import {
  CARD_EXPIRY_PATTERN,
  CARD_HOLDER_MAX_LENGTH,
  CARD_NUMBER_PATTERN,
} from "@/lib/constants/account";
import { SHOP_TIME_ZONE } from "@/lib/constants/shipping";
import { BankCardType } from "@/lib/enums/bank-card";

/** Separator between the month and the year of an expiry (`MM/YYYY`). */
const EXPIRY_SEPARATOR = "/";

/** Whitespace removed from a typed card number (`1111 1111 …`). */
const NUMBER_SPACES = /\s+/g;

/** Locale whose numeric date parts are plain digits, to read the shop's current month. */
const DIGITS_LOCALE = "en-CA";

/** Message of an expiry in the past (technical; the forms show their French text). */
const EXPIRED_MESSAGE = "Expiry date in the past";

/** `BankCardResponseDto`. */
export const BankCardSchema = z.object({
  uuid: z.uuid(),
  /** May be empty for an old card. */
  cardHolderName: z.string().nullable(),
  /** Masked number, never the full one. */
  maskedNumber: z.string().min(1),
  /** `MM/YYYY`. */
  expiryDate: z.string().regex(CARD_EXPIRY_PATTERN).nullable(),
  cardType: z.enum(BankCardType),
});

/** Saved card, masked. */
export type BankCard = z.infer<typeof BankCardSchema>;

/**
 * Current year and month in the shop's time zone, the reference of the backend expiry check.
 *
 * @param now - Current time.
 * @returns The year and the month (1–12).
 */
export function currentYearMonth(now: Date): { readonly year: number; readonly month: number } {
  const parts = new Intl.DateTimeFormat(DIGITS_LOCALE, {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month") };
}

/**
 * Whether an expiry is before the current month (a card stays valid until the end of its
 * expiry month, as the backend checks it).
 *
 * @param expiry - `MM/YYYY`.
 * @param now - Current time.
 * @returns `true` when the card has expired.
 */
export function isExpiryPast(expiry: string, now: Date): boolean {
  const [month, year] = expiry.split(EXPIRY_SEPARATOR).map(Number);
  const current = currentYearMonth(now);
  if (month === undefined || year === undefined) {
    return true;
  }
  return year < current.year || (year === current.year && month < current.month);
}

/**
 * Builds `MM/YYYY` from the two expiry selects.
 *
 * @param month - Month, `01`–`12`.
 * @param year - Year, 4 digits.
 * @returns The expiry as the backend expects it.
 */
export function toExpiryDate(month: string, year: string): string {
  return `${month}${EXPIRY_SEPARATOR}${year}`;
}

/** Expiry `MM/YYYY`, not in the past (`@Pattern` + `validateExpiryNotInThePast`). */
const ExpiryDateSchema = z
  .string()
  .regex(CARD_EXPIRY_PATTERN)
  .refine((expiry) => !isExpiryPast(expiry, new Date()), { message: EXPIRED_MESSAGE });

/** Holder name: trimmed, not blank (`@NotBlank`). */
const HolderNameSchema = z.string().trim().min(1).max(CARD_HOLDER_MAX_LENGTH);

/** `BankCardUpdateRequestDto`: holder and expiry only (the number is write-once). */
export const BankCardUpdateSchema = z.object({
  cardHolderName: HolderNameSchema,
  expiryDate: ExpiryDateSchema,
});

/** Validated card update. */
export type BankCardUpdate = z.infer<typeof BankCardUpdateSchema>;

/**
 * Body of `POST /api/bank-card` (« Ajouter une carte »), strict: any other field is refused.
 * Spaces are removed from the number before its 13–19 digits are checked. `replace` deletes the
 * current card first (the backend refuses a second card).
 */
export const BankCardAddBodySchema = z.strictObject({
  cardHolderName: HolderNameSchema,
  cardNumber: z
    .string()
    .transform((value) => value.replace(NUMBER_SPACES, ""))
    .pipe(z.string().regex(CARD_NUMBER_PATTERN)),
  expiryDate: ExpiryDateSchema,
  cardType: z.enum(BankCardType),
  replace: z.boolean().optional(),
});

/** Validated add body. */
export type BankCardAddBody = z.infer<typeof BankCardAddBodySchema>;

/** `BankCardCreationRequestDto`: the add body without the BFF-only `replace` flag. */
export type BankCardCreation = Omit<BankCardAddBody, "replace">;

/**
 * Answer of `POST /api/bank-card`: the masked card only (no UUID, no holder). Never contains
 * the number that was sent.
 */
export const AddedCardSchema = BankCardSchema.pick({
  maskedNumber: true,
  expiryDate: true,
  cardType: true,
});

/** Masked card answered by the BFF after an add. */
export type AddedCard = z.infer<typeof AddedCardSchema>;
