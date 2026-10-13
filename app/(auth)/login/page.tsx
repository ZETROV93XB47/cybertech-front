/**
 * Sign-in page (US3, FR-015). Auth.js sends here (`pages.signIn`) and the header links here.
 *
 * The page only renders a form whose Server Action starts the Keycloak flow: `signIn` must never
 * run while a Server Component renders. With JavaScript the form submits itself; after a failed
 * attempt (`?error=`) it waits for a click, so a broken Keycloak never causes a redirect loop.
 *
 * @see specs/001-catalog-auth-cart/tasks.md T094
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signInWithKeycloak } from "@/features/auth/actions";
import { AutoSubmit } from "@/features/auth/components/AutoSubmit";
import { AUTH_MESSAGES } from "@/features/auth/messages";
import { safeCallbackPath } from "@/lib/auth/callback-url";
import { auth } from "@/lib/auth/config";
import { AUTH_ERROR_PARAM, CALLBACK_URL_PARAM } from "@/lib/constants/auth";
import { getEnv } from "@/lib/env";

/** Page metadata: never indexed. */
export const metadata: Metadata = {
  title: AUTH_MESSAGES.loginTitle,
  robots: { index: false },
};

/** Props given by Next.js to the page. */
interface LoginPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Reads a single query parameter value.
 *
 * @param value - Raw value.
 * @returns The first value, or `null`.
 */
function single(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/**
 * Sign-in page.
 *
 * @param props - Page props.
 * @returns The sign-in form; redirects at once when already signed in.
 */
export default async function LoginPage({ searchParams }: LoginPageProps): Promise<ReactNode> {
  const params = await searchParams;
  const callbackPath = safeCallbackPath(single(params[CALLBACK_URL_PARAM]), getEnv().AUTH_URL);
  const session = await auth();
  if (session && !session.error) {
    redirect(callbackPath);
  }
  const failed = single(params[AUTH_ERROR_PARAM]) !== null;
  return (
    <section
      aria-labelledby="login-title"
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-20"
    >
      <h1 id="login-title" className="text-3xl">
        {AUTH_MESSAGES.loginTitle}
      </h1>
      <p className="text-text-muted">{AUTH_MESSAGES.loginDescription}</p>
      {failed ? (
        <p role="alert" className="text-rose">
          {AUTH_MESSAGES.loginFailed}
        </p>
      ) : (
        <p role="status" className="text-sm text-text-muted">
          {AUTH_MESSAGES.loginRedirecting} {AUTH_MESSAGES.loginManual}
        </p>
      )}
      <form action={signInWithKeycloak} className="glass flex flex-col gap-4 rounded-card p-6">
        <input type="hidden" name={CALLBACK_URL_PARAM} value={callbackPath} />
        {!failed && <AutoSubmit />}
        <button
          type="submit"
          className="cta-gradient inline-flex h-11 items-center justify-center rounded-button px-6 font-medium"
        >
          {AUTH_MESSAGES.signIn}
        </button>
      </form>
    </section>
  );
}
