"use client";

/**
 * Submits its enclosing form once, right after hydration.
 *
 * Used by the sign-in page: with JavaScript the visitor goes straight to Keycloak; without it,
 * the visible button of the same form does the job (progressive enhancement).
 *
 * The form is only submitted once the session has been read: a `GET /api/auth/session` still in
 * flight when the browser leaves for Keycloak can answer after the sign-in callback and write the
 * previous (expired) session cookie over the new one.
 */
import { useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/**
 * Invisible marker that submits the closest form on mount.
 *
 * @returns An empty span.
 */
export function AutoSubmit(): ReactNode {
  const { status } = useSession();
  const marker = useRef<HTMLSpanElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current || status === LOADING_STATUS) {
      return;
    }
    submitted.current = true;
    marker.current?.closest("form")?.requestSubmit();
  }, [status]);
  return <span ref={marker} hidden />;
}
