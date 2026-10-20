/**
 * Saved card as « Ma carte » shows it: network, last four digits, holder and expiry split for
 * the edit selects. Built on the server from the masked backend card; the card UUID never
 * reaches the browser.
 *
 * @see specs/003-account-orders/spec.md US5, FR-031
 */
import {
  CARD_LAST_DIGITS_PATTERN,
  CARD_EXPIRY_YEARS_AHEAD,
  MONTHS_PER_YEAR,
} from "@/lib/constants/account";
import type { BankCardType } from "@/lib/enums/bank-card";
import { currentYearMonth, type BankCard } from "@/lib/schemas/bank-card";

/** Separator between the month and the year of an expiry (`MM/YYYY`). */
const EXPIRY_SEPARATOR = "/";

/** Width of a month in the select values (`01`). */
const MONTH_DIGITS = 2;

/** Saved card shown by « Ma carte ». */
export interface CardView {
  readonly network: BankCardType;
  /** Last four digits, or the masked number when they cannot be isolated. */
  readonly lastDigits: string;
  /** Holder name, empty when unknown. */
  readonly holder: string;
  /** Expiry month `01`–`12`, empty when unknown. */
  readonly expiryMonth: string;
  /** Expiry year, empty when unknown. */
  readonly expiryYear: string;
}

/**
 * Turns the masked backend card into the displayed card.
 *
 * @param card - Masked card.
 * @returns The card view.
 */
export function toCardView(card: BankCard): CardView {
  const [month = "", year = ""] = (card.expiryDate ?? "").split(EXPIRY_SEPARATOR);
  return {
    network: card.cardType,
    lastDigits: CARD_LAST_DIGITS_PATTERN.exec(card.maskedNumber)?.[1] ?? card.maskedNumber,
    holder: card.cardHolderName ?? "",
    expiryMonth: month,
    expiryYear: year,
  };
}

/**
 * Options of the expiry month select: `01` to `12`.
 *
 * @returns The months.
 */
export function expiryMonthOptions(): readonly string[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, index) =>
    String(index + 1).padStart(MONTH_DIGITS, "0"),
  );
}

/**
 * Options of the expiry year select: the current year and the next ones, plus the saved year
 * when it is older (so an expired card can still be shown and corrected).
 *
 * @param now - Current time.
 * @param savedYear - Year of the saved card, if any.
 * @returns The years, ascending.
 */
export function expiryYearOptions(now: Date, savedYear = ""): readonly string[] {
  const { year } = currentYearMonth(now);
  const years = Array.from({ length: CARD_EXPIRY_YEARS_AHEAD }, (_, index) => String(year + index));
  return savedYear !== "" && !years.includes(savedYear) ? [savedYear, ...years] : years;
}
