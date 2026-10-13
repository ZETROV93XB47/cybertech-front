/**
 * Fields of the registration form. The values are the field names of the backend
 * `UserCreateRequestDto`, so backend `fieldErrors` map onto the form without translation.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §2 (RegisterInput)
 * @see UserCreateRequestDto (backend)
 */

/** One field of the registration form. */
export enum RegisterField {
  EMAIL = "email",
  FIRST_NAME = "firstName",
  LAST_NAME = "lastName",
  SEX = "sex",
  PHONE_NUMBER = "phoneNumber",
  FAVORITE_COMMUNICATION_CHANNEL = "favoriteCommunicationChanel",
  STREET = "street",
  CITY = "city",
  ZIP_CODE = "zipCode",
  COUNTRY = "country",
  BIRTH_DATE = "birthDate",
  PASSWORD = "password",
}
