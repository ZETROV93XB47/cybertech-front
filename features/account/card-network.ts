/**
 * Card network deduced from the number while it is typed in « Ajouter une carte », and the
 * display of that number in groups of four. The deduced network only preselects the network
 * select: the customer can change it (decision of 2026-10-20). The test card `1111…` matches no
 * rule and preselects « Autre ».
 *
 * @see specs/003-account-orders/research.md R21
 */
import { CARD_NUMBER_GROUP_SIZE, CARD_NUMBER_MAX_DIGITS } from "@/lib/constants/account";
import { BankCardType } from "@/lib/enums/bank-card";

/** One prefix rule: the first `length` digits, read as a number, between `from` and `to`. */
interface NetworkRule {
  readonly type: BankCardType;
  readonly length: number;
  readonly from: number;
  readonly to: number;
}

/**
 * Issuer prefixes (IIN ranges), most specific first, so that `6011` is Discover before any
 * shorter rule could match.
 */
const NETWORK_RULES: readonly NetworkRule[] = [
  { type: BankCardType.DISCOVER, length: 4, from: 6011, to: 6011 },
  { type: BankCardType.MASTERCARD, length: 4, from: 2221, to: 2720 },
  { type: BankCardType.DISCOVER, length: 3, from: 644, to: 649 },
  { type: BankCardType.AMERICAN_EXPRESS, length: 2, from: 34, to: 34 },
  { type: BankCardType.AMERICAN_EXPRESS, length: 2, from: 37, to: 37 },
  { type: BankCardType.MASTERCARD, length: 2, from: 51, to: 55 },
  { type: BankCardType.DISCOVER, length: 2, from: 65, to: 65 },
  { type: BankCardType.VISA, length: 1, from: 4, to: 4 },
];

/** Anything that is not a digit. */
const NON_DIGITS = /\D/g;

/**
 * Keeps the digits of a typed number, at most {@link CARD_NUMBER_MAX_DIGITS}.
 *
 * @param typed - Value of the field.
 * @returns The digits.
 */
export function cardDigits(typed: string): string {
  return typed.replace(NON_DIGITS, "").slice(0, CARD_NUMBER_MAX_DIGITS);
}

/**
 * Shows digits in groups of four (`1111 1111 1111 1111`).
 *
 * @param digits - Digits only.
 * @returns The grouped number.
 */
export function formatCardDigits(digits: string): string {
  const groups: string[] = [];
  for (let start = 0; start < digits.length; start += CARD_NUMBER_GROUP_SIZE) {
    groups.push(digits.slice(start, start + CARD_NUMBER_GROUP_SIZE));
  }
  return groups.join(" ");
}

/**
 * Network of a card number, from its first digits.
 *
 * @param digits - Digits typed so far.
 * @returns The matching network, `OTHER` when no rule matches.
 */
export function detectCardNetwork(digits: string): BankCardType {
  const rule = NETWORK_RULES.find(
    ({ length, from, to }) =>
      digits.length >= length &&
      Number(digits.slice(0, length)) >= from &&
      Number(digits.slice(0, length)) <= to,
  );
  return rule?.type ?? BankCardType.OTHER;
}
