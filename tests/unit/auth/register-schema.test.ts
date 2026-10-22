import { describe, expect, it } from "vitest";

import { RegisterField } from "@/lib/enums/register-field";
import {
  RegisterInputSchema,
  localIsoDate,
  toRegisterFieldErrors,
  toUserCreateRequest,
} from "@/lib/schemas/register";

const VALID_FORM: Record<string, string> = {
  email: "  camille@example.com ",
  firstName: " Camille ",
  lastName: "Testeur",
  sex: "F",
  phoneNumber: "+33600000000",
  favoriteCommunicationChanel: "EMAIL",
  street: "1 rue du Test",
  city: "Paris",
  zipCode: "75001",
  country: "France",
  birthDate: "1990-05-17",
  password: "Passw0rd!",
};

function errorsFor(overrides: Record<string, string>) {
  const parsed = RegisterInputSchema.safeParse({ ...VALID_FORM, ...overrides });
  return parsed.success ? {} : toRegisterFieldErrors(parsed.error);
}

describe("RegisterInputSchema", () => {
  it("accepts a complete form and trims the text fields", () => {
    const parsed = RegisterInputSchema.parse(VALID_FORM);
    expect(parsed.email).toBe("camille@example.com");
    expect(parsed.firstName).toBe("Camille");
  });

  it.each([
    [RegisterField.EMAIL, "pas-un-email", "Vérifie ton adresse email."],
    [RegisterField.FIRST_NAME, "C", "Entre 2 et 50 caractères."],
    [RegisterField.LAST_NAME, "x".repeat(51), "Entre 2 et 50 caractères."],
    [RegisterField.FIRST_NAME, "   ", "Entre 2 et 50 caractères."],
    [RegisterField.SEX, "", "Choisis une option."],
    [RegisterField.SEX, "X", "Choisis une option."],
    [RegisterField.PHONE_NUMBER, " ", "Indique ton numéro de téléphone."],
    [RegisterField.FAVORITE_COMMUNICATION_CHANNEL, "", "Choisis une option."],
    // The backend rejects PUSH_NOTIFICATION at registration (400): Web Push is not a choice.
    [RegisterField.FAVORITE_COMMUNICATION_CHANNEL, "PUSH_NOTIFICATION", "Choisis une option."],
    [RegisterField.STREET, "", "Ce champ est requis."],
    [RegisterField.CITY, " ", "Ce champ est requis."],
    [RegisterField.ZIP_CODE, "", "Ce champ est requis."],
    [RegisterField.COUNTRY, "", "Ce champ est requis."],
    [RegisterField.PASSWORD, "1234567", "8 caractères minimum."],
  ])("rejects %s = %j with « %s »", (field, value, message) => {
    expect(errorsFor({ [field]: value })[field]).toBe(message);
  });

  it("accepts names of exactly 2 and 50 characters and a password of 8", () => {
    expect(errorsFor({ firstName: "Al", lastName: "x".repeat(50), password: "12345678" })).toEqual(
      {},
    );
  });

  it("treats the birth date as optional but requires a past date", () => {
    expect(errorsFor({ birthDate: "" })).toEqual({});
    expect(errorsFor({ birthDate: localIsoDate() })[RegisterField.BIRTH_DATE]).toBe(
      "La date doit être dans le passé.",
    );
    expect(errorsFor({ birthDate: "3000-01-01" })[RegisterField.BIRTH_DATE]).toBeDefined();
    expect(errorsFor({ birthDate: "17/05/1990" })[RegisterField.BIRTH_DATE]).toBeDefined();
  });
});

describe("toUserCreateRequest", () => {
  it("sends the birth date as a LocalDateTime and never a bank card", () => {
    const body = toUserCreateRequest(RegisterInputSchema.parse(VALID_FORM));
    expect(body.birthDate).toBe("1990-05-17T00:00:00");
    expect(body).not.toHaveProperty("bankCardCreationRequestDto");
  });

  it("omits an empty birth date", () => {
    const body = toUserCreateRequest(RegisterInputSchema.parse({ ...VALID_FORM, birthDate: "" }));
    expect(body).not.toHaveProperty("birthDate");
  });
});
