/**
 * Technical sheet of a product: its `attributes`, labelled with the category schema (FR-006).
 */
import { UI_LOCALE } from "@/lib/format";
import { humanizeKey } from "@/lib/schemas/category";

import { ATTRIBUTE_LABELS, ATTRIBUTE_UNITS, PRODUCT_MESSAGES } from "./messages";

/** One line of the technical sheet. */
export interface ProductSpec {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Formats an attribute value for display, the same way on the product page and in the
 * comparator: numbers in French format with their unit, booleans as « Oui » / « Non »,
 * trimmed strings.
 *
 * @param key - Attribute key (to find its unit).
 * @param value - Raw value from the backend.
 * @returns The text, or `null` for values that cannot be shown (objects, empty strings).
 * @see specs/002-catalog-refresh/data-model.md §6
 */
export function formatSpecValue(key: string, value: unknown): string | null {
  if (typeof value === "number") {
    const unit = ATTRIBUTE_UNITS[key];
    const number = value.toLocaleString(UI_LOCALE);
    return unit ? `${number} ${unit}` : number;
  }
  if (typeof value === "boolean") {
    return value ? PRODUCT_MESSAGES.booleanTrue : PRODUCT_MESSAGES.booleanFalse;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

/**
 * Builds the technical sheet: schema properties first (in schema order), then any extra
 * attribute the schema does not describe.
 *
 * @param attributes - Product attributes.
 * @param schemaLabels - Labels read from the category schema, by key.
 * @returns The lines to display.
 */
export function buildProductSpecs(
  attributes: Readonly<Record<string, unknown>>,
  schemaLabels: Readonly<Record<string, string>>,
): ProductSpec[] {
  const keys = [...new Set([...Object.keys(schemaLabels), ...Object.keys(attributes)])];
  return keys.flatMap((key) => {
    const value = formatSpecValue(key, attributes[key]);
    if (value === null) {
      return [];
    }
    const label = ATTRIBUTE_LABELS[key] ?? schemaLabels[key] ?? humanizeKey(key);
    return [{ key, label, value }];
  });
}
