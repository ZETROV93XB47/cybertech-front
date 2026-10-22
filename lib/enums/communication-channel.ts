/**
 * Preferred communication channel chosen at registration.
 *
 * The backend field is spelled `favoriteCommunicationChanel` (sic); only the values live here.
 * The backend enum also has `PUSH_NOTIFICATION`, but it is not selectable: registration rejects
 * it with a 400, because Web Push is always sent on top of the chosen channel to the browsers the
 * user subscribed. It is therefore deliberately absent here.
 *
 * @see UserCreateRequestDto#isFavoriteCommunicationChanelSelectable (backend)
 * @see docs/web-push.md (backend)
 * @see docs/backend/api-map.md D.1
 */

/** Backend communication channel enum. */
export enum CommunicationChannel {
  /** Notifications sent by e-mail. */
  EMAIL = "EMAIL",
  /** Notifications sent by SMS. */
  SMS = "SMS",
}
