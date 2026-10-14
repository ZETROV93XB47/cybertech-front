// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseFlatAddress, type ParsedAddress } from "@/lib/address";

/** Result with every field unknown. */
const EMPTY: ParsedAddress = { street: "", zipCode: "", city: "", country: "" };

describe("parseFlatAddress", () => {
  it("splits the backend one-line format", () => {
    expect(parseFlatAddress("12 rue de la Paix, 75002 Paris, France")).toEqual({
      street: "12 rue de la Paix",
      zipCode: "75002",
      city: "Paris",
      country: "France",
    });
  });

  it("keeps a comma inside the street", () => {
    expect(parseFlatAddress("Bâtiment B, 3 allée des Lilas, 69003 Lyon, France")).toEqual({
      street: "Bâtiment B, 3 allée des Lilas",
      zipCode: "69003",
      city: "Lyon",
      country: "France",
    });
  });

  it("keeps a composed city", () => {
    expect(parseFlatAddress("5 cours Mirabeau, 13001 Aix en Provence, France")).toMatchObject({
      zipCode: "13001",
      city: "Aix en Provence",
    });
  });

  it("empties the fields the backend formatted as null", () => {
    expect(parseFlatAddress("null, null null, null")).toEqual(EMPTY);
    expect(parseFlatAddress("1 rue du Test, null Paris, France")).toEqual({
      street: "1 rue du Test",
      zipCode: "",
      city: "Paris",
      country: "France",
    });
  });

  it("returns empty fields for a missing or empty address", () => {
    expect(parseFlatAddress(null)).toEqual(EMPTY);
    expect(parseFlatAddress(undefined)).toEqual(EMPTY);
    expect(parseFlatAddress("")).toEqual(EMPTY);
    expect(parseFlatAddress("   ")).toEqual(EMPTY);
  });

  it("does not guess an unexpected format", () => {
    expect(parseFlatAddress("Paris, France")).toEqual(EMPTY);
    expect(parseFlatAddress("somewhere")).toEqual(EMPTY);
  });

  it("leaves the city empty when only a zip code is given", () => {
    expect(parseFlatAddress("1 rue du Test, 75001, France")).toEqual({
      street: "1 rue du Test",
      zipCode: "75001",
      city: "",
      country: "France",
    });
  });
});
