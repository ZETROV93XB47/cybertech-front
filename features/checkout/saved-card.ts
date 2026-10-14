/**
 * Saved card as shown by the checkout: the network, the last four digits and the expiry, or the
 * absence of a card (placing blocked, « Ajouter une carte »), or an unreadable card (placing left
 * to the backend). Built on the server: the holder name and the card UUID never reach the
 * browser.
 *
 * @see specs/003-account-orders/spec.md FR-009
 * @see specs/003-account-orders/research.md R21
 */
import { CARD_LAST_DIGITS_PATTERN } from "@/lib/constants/account";
import type { BankCardType } from "@/lib/enums/bank-card";
import { SavedCardKind } from "@/lib/enums/checkout";
import type { BankCard } from "@/lib/schemas/bank-card";

/** Saved card read for the checkout. */
export type SavedCard =
  | {
      readonly kind: SavedCardKind.PRESENT;
      readonly network: BankCardType;
      /** Last four digits, or the masked number when they cannot be isolated. */
      readonly lastDigits: string;
      /** `MM/YYYY`, `null` when unknown. */
      readonly expiry: string | null;
    }
  | { readonly kind: SavedCardKind.ABSENT }
  | { readonly kind: SavedCardKind.UNKNOWN };

/** Card that could not be read. */
export const UNKNOWN_SAVED_CARD: SavedCard = { kind: SavedCardKind.UNKNOWN };

/**
 * Turns the backend card into what the checkout shows.
 *
 * @param card - Masked card, or `null` when none is saved.
 * @returns The saved card view.
 */
export function toSavedCard(card: BankCard | null): SavedCard {
  if (card === null) {
    return { kind: SavedCardKind.ABSENT };
  }
  return {
    kind: SavedCardKind.PRESENT,
    network: card.cardType,
    lastDigits: CARD_LAST_DIGITS_PATTERN.exec(card.maskedNumber)?.[1] ?? card.maskedNumber,
    expiry: card.expiryDate,
  };
}
