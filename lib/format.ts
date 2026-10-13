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
