/**
 * Displayed profile of « Mon profil » (feature 003 US4): the identity read from
 * `GET /user/me` and its one-line address split into fields to prefill the form.
 *
 * The split never guesses (FR-030): an uncertain field stays empty. The phone is never part of
 * the view, the backend does not return it.
 *
 * @see specs/003-account-orders/data-model.md §4.7
 * @see specs/003-account-orders/research.md R16
 */
import { parseFlatAddress, type ParsedAddress } from "@/lib/address";
import type { UserProfile } from "@/lib/schemas/user";

/** Separator of the address line shown in the identity card. */
const ADDRESS_LINE_SEPARATOR = ", ";

/** Separator between the zip code and the city of the address line. */
const ZIP_CITY_SEPARATOR = " ";

/** Profile as shown by « Mon profil ». */
export interface ProfileView {
  readonly firstName: string;
  readonly lastName: string;
  /** Read-only: owned by Keycloak. Displayed, never logged. */
  readonly email: string;
  /** Read-only: owned by Keycloak. */
  readonly username: string;
  /** Address split into fields, empty fields when unknown. */
  readonly address: ParsedAddress;
  /** Address line rebuilt from the known fields, `null` when none is known. */
  readonly addressLine: string | null;
}

/**
 * Rebuilds a readable address line from the known fields only, so a `"null"` written by the
 * backend for a missing field is never displayed.
 *
 * @param address - Split address.
 * @returns The line, or `null` when every field is unknown.
 */
export function toAddressLine(address: ParsedAddress): string | null {
  const zipCity = [address.zipCode, address.city].filter(Boolean).join(ZIP_CITY_SEPARATOR);
  const parts = [address.street, zipCity, address.country].filter(Boolean);
  return parts.length === 0 ? null : parts.join(ADDRESS_LINE_SEPARATOR);
}

/**
 * Builds the displayed profile.
 *
 * @param profile - Profile validated by `UserProfileSchema`.
 * @returns The view.
 */
export function toProfileView(profile: UserProfile): ProfileView {
  const address = parseFlatAddress(profile.address);
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    username: profile.username,
    address,
    addressLine: toAddressLine(address),
  };
}
