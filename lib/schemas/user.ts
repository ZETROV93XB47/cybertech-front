/**
 * Profile of the signed-in user (`UserResponseDto` from `GET /user/me`).
 *
 * Only the fields lot 1 displays are validated and kept; Zod strips the others (address, phone,
 * birth date…), so the front neither depends on their format nor keeps personal data it does not
 * need (constitution IV).
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 (CurrentUser)
 * @see docs/backend/api-map.md D.20
 */
import { z } from "zod";

/** `UserResponseDto`, reduced to what the welcome message needs. */
export const CurrentUserSchema = z.object({
  uuid: z.uuid(),
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

/** The signed-in user. */
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/**
 * `UserResponseDto` for the profile page and the checkout prefill (feature 003): adds the user
 * name and the one-line address (`"street, zip city, country"`, split by `parseFlatAddress`).
 * The phone is never returned by the backend.
 *
 * @see specs/003-account-orders/data-model.md §2.5
 */
export const UserProfileSchema = CurrentUserSchema.extend({
  username: z.string().min(1),
  address: z.string().nullable().optional(),
});

/** Profile of the signed-in user. */
export type UserProfile = z.infer<typeof UserProfileSchema>;
