/**
 * Preferred communication channel chosen at registration.
 *
 * The backend field is spelled `favoriteCommunicationChanel` (sic); only the values live here.
 *
 * @see docs/backend/api-map.md D.1
 */

/** Backend communication channel enum. */
export enum CommunicationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH_NOTIFICATION = "PUSH_NOTIFICATION",
}
