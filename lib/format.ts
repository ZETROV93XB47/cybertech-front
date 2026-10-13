/**
 * Display formatting shared by server and client components.
 *
 * Amounts come from the backend as plain numbers in euros (api-map §0); the front only formats
 * them and never recomputes an authoritative total (constitution V).
 */

/** Locale of the interface (French only, spec). */
export const UI_LOCALE = "fr-FR";

/** Currency of every amount (hard-coded EUR on the backend). */
export const CURRENCY = "EUR";

const priceFormatter = new Intl.NumberFormat(UI_LOCALE, { style: "currency", currency: CURRENCY });

/**
 * Formats an amount in euros, French style (`1 499,90 €`).
 *
 * @param amount - Amount in euros.
 * @returns The formatted price.
 */
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat(UI_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Time zone designator added to backend `LocalDateTime` values, which carry none. */
const UTC_SUFFIX = "Z";

/** Detects a value that already carries a time zone (`Z` or `+01:00`). */
const HAS_TIME_ZONE = /(Z|[+-]\d{2}:\d{2})$/;

/**
 * Formats a backend date as « 27 novembre ».
 *
 * Backend `LocalDateTime` values have no time zone; they are read as UTC (data-model §1).
 *
 * @param value - ISO date-time, with or without time zone.
 * @returns The formatted day, or `null` when the value is not a date.
 */
export function formatDay(value: string): string | null {
  const date = new Date(HAS_TIME_ZONE.test(value) ? value : `${value}${UTC_SUFFIX}`);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}
