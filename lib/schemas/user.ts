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
