/**
 * Auth.js endpoints (sign-in, callback, session, sign-out) under `/api/auth/*`.
 */
import { handlers } from "@/lib/auth/config";

/** `GET` and `POST` handlers provided by Auth.js. */
export const { GET, POST } = handlers;
