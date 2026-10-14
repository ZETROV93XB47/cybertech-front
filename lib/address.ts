/**
 * Splitting of the one-line addresses returned by the backend.
 *
 * The backend stores addresses field by field but returns them flattened
 * (`UserResponseDto.address`, `OrderResponseDto.shippingAddress`), formatted as
 * `"%s, %s %s, %s"` (street, zip code, city, country). The front splits them back to prefill
 * the forms, and never guesses: an uncertain field stays empty, to be typed (FR-030).
 *
 * @see specs/003-account-orders/data-model.md §4.6
 * @see specs/003-account-orders/research.md R16
 * @see UserMapper#mapAddressToString, OrderMapper#mapAddressToString (backend)
 */

/** Separator between the street, the « zip city » part and the country. */
const SEGMENT_SEPARATOR = ", ";

/** Separator between the zip code and the city. */
const ZIP_CITY_SEPARATOR = " ";

/** What `String.format` writes for a missing field. */
const NULL_TEXT = "null";

/** Fewest segments of a well-formed address: street, « zip city », country. */
const MIN_SEGMENTS = 3;

/** Number of trailing segments that are not the street (« zip city » and country). */
const TRAILING_SEGMENTS = 2;

/** Address split into its fields; an unknown field is an empty string. */
export interface ParsedAddress {
  readonly street: string;
  readonly zipCode: string;
  readonly city: string;
  readonly country: string;
}

/** Address with every field unknown. */
const EMPTY_ADDRESS: ParsedAddress = { street: "", zipCode: "", city: "", country: "" };

/**
 * Cleans one part of the address.
 *
 * @param part - Raw part, possibly `undefined`.
 * @returns The trimmed part, or an empty string for a missing or `"null"` part.
 */
function clean(part: string | undefined): string {
  const value = part?.trim() ?? "";
  return value === NULL_TEXT ? "" : value;
}

/**
 * Splits the « zip city » segment at its first space.
 *
 * @param segment - Segment such as `"13001 Aix en Provence"`.
 * @returns The zip code and the city (city empty when there is no space).
 */
function splitZipCity(segment: string): Pick<ParsedAddress, "zipCode" | "city"> {
  const trimmed = segment.trim();
  const index = trimmed.indexOf(ZIP_CITY_SEPARATOR);
  if (index < 0) {
    return { zipCode: clean(trimmed), city: "" };
  }
  return { zipCode: clean(trimmed.slice(0, index)), city: clean(trimmed.slice(index + 1)) };
}

/**
 * Splits a one-line backend address into street, zip code, city and country.
 *
 * The last segment is the country, the one before is « zip city », and every earlier segment
 * is joined back as the street (a street may contain a comma). Fewer than three segments is
 * an unexpected format: every field is left empty rather than guessed.
 *
 * @param text - Flattened address, `null` or `undefined` when the backend has none.
 * @returns The split address; unknown fields are empty strings.
 * @see specs/003-account-orders/spec.md FR-030
 */
export function parseFlatAddress(text: string | null | undefined): ParsedAddress {
  const segments = (text ?? "").split(SEGMENT_SEPARATOR);
  if (segments.length < MIN_SEGMENTS) {
    return EMPTY_ADDRESS;
  }
  const streetSegments = segments.slice(0, -TRAILING_SEGMENTS);
  const [zipCity, country] = segments.slice(-TRAILING_SEGMENTS);
  return {
    street: clean(streetSegments.join(SEGMENT_SEPARATOR)),
    ...splitZipCity(zipCity ?? ""),
    country: clean(country),
  };
}
