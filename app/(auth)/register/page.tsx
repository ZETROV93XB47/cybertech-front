/**
 * Registration page (US2). Registering never signs the user in: the success panel invites them
 * to sign in (FR-014).
 *
 * @see specs/001-catalog-auth-cart/spec.md US2
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { AUTH_MESSAGES, REGISTER_MESSAGES } from "@/features/auth/messages";
import { loginPath } from "@/lib/auth/callback-url";
import { HOME_PATH } from "@/lib/constants/routes";

/** Page metadata: never indexed. */
export const metadata: Metadata = {
  title: REGISTER_MESSAGES.pageTitle,
  robots: { index: false },
};

/**
 * Registration page.
 *
 * @returns Title, introduction and form.
 */
export default function RegisterPage(): ReactNode {
  return (
    <section
      aria-labelledby="register-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12"
    >
      <div className="flex flex-col gap-3">
        <h1 id="register-title" className="text-3xl">
          {REGISTER_MESSAGES.pageTitle}
        </h1>
        <p className="text-text-muted">{REGISTER_MESSAGES.pageDescription}</p>
        <p className="text-sm text-text-muted">
          {REGISTER_MESSAGES.alreadyHaveAccount}{" "}
          <Link
            href={loginPath(HOME_PATH)}
            className="text-brand-text underline underline-offset-4"
          >
            {AUTH_MESSAGES.signIn}
          </Link>
        </p>
      </div>
      <RegisterForm />
    </section>
  );
}
