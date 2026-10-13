/**
 * Home page title: « Content de te revoir, <prénom> » for a signed-in user (US3 scenario 4,
 * FR-019), the time-based greeting otherwise.
 *
 * Server Component: the first name is read with `GET /user/me` on the server and never stored in
 * the browser. A failure only falls back to the anonymous greeting.
 *
 * @see specs/001-catalog-auth-cart/research.md R13
 */
import type { ReactNode } from "react";

import { Greeting } from "@/features/catalog/components/Greeting";
import { getMe } from "@/lib/api/endpoints/users";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { createModuleLogger } from "@/lib/logger";

import { AUTH_MESSAGES } from "../messages";

const log = createModuleLogger("auth.welcome");

/** Props of {@link Welcome}. */
export interface WelcomeProps {
  readonly className?: string;
}

/**
 * Reads the first name of the signed-in user.
 *
 * @returns The first name, or `undefined` for a visitor or when the profile cannot be read.
 */
async function readFirstName(): Promise<string | undefined> {
  let accessToken: string;
  try {
    accessToken = await getAccessTokenOrThrow();
  } catch {
    return undefined;
  }
  try {
    return (await getMe(accessToken)).firstName;
  } catch {
    log.warn({}, "Profile not loaded; anonymous greeting shown");
    return undefined;
  }
}

/**
 * Home page title.
 *
 * @param props - Optional class names.
 * @returns The personal or anonymous greeting.
 */
export async function Welcome({ className }: WelcomeProps): Promise<ReactNode> {
  const firstName = await readFirstName();
  return (
    <Greeting
      {...(className === undefined ? {} : { className })}
      personalTitle={firstName ? AUTH_MESSAGES.welcomeBack(firstName) : undefined}
    />
  );
}
