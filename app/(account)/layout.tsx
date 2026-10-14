/**
 * Layout of every private page (`/account/**`, `/checkout/**`).
 *
 * Second line of the private-page guard (constitution II): `proxy.ts` only checks that a session
 * cookie is present; this layout validates the session for real and sends the browser to the
 * sign-in page otherwise, with the requested page to come back to. Rendered dynamically: private
 * data is never cached.
 *
 * @see specs/003-account-orders/research.md R1
 * @see specs/003-account-orders/contracts/bff-routes.md §4
 */
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { requireSession } from "@/lib/auth/guards";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";
import { REQUEST_PATH_HEADER } from "@/lib/constants/security";

/** Private pages depend on the session: never prerendered nor cached. */
export const dynamic = "force-dynamic";

/**
 * Renders a private page once the session is valid.
 *
 * @param props - Layout props.
 * @param props.children - Private page.
 * @returns The page, or never (redirect to the sign-in page).
 */
export default async function AccountLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactNode> {
  // The path set by the proxy; the account root is a safe fallback (the proxy always runs).
  const requestedPath = (await headers()).get(REQUEST_PATH_HEADER) ?? ACCOUNT_PATHS.root;
  await requireSession(requestedPath);
  return children;
}
