/**
 * « Mon profil » (feature 003 US4): the identity as stored (read-only email and user name, link
 * to the account console for the password) and the form editing name, phone and address, which
 * prefill the checkout. Read on the server with the user's token, never cached; shown in the
 * account shell.
 *
 * @see specs/003-account-orders/spec.md US4, FR-028 to FR-030
 * @see specs/003-account-orders/research.md R16, R17
 */
import { UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/features/account/components/ProfileForm";
import { ProfileIdentity } from "@/features/account/components/ProfileIdentity";
import { PROFILE_MESSAGES } from "@/features/account/messages";
import { readProfileView } from "@/features/account/server/profile-data";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { accountConsoleUrl } from "@/lib/auth/account-console";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { ACCOUNT_PATHS, HOME_PATH } from "@/lib/constants/routes";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: PROFILE_MESSAGES.metaTitle,
  description: PROFILE_MESSAGES.pageDescription,
  robots: { index: false },
};

/**
 * Profile page.
 *
 * @returns Header, identity card and form.
 * @throws {ApiError} When the backend cannot read the profile (error boundary).
 */
export default async function ProfilePage(): Promise<ReactNode> {
  const accessToken = await getAccessTokenOrRedirect(ACCOUNT_PATHS.profile);
  const view = await readProfileView(accessToken);
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: PROFILE_MESSAGES.pageTitle },
            ]}
          />
        }
        title={<LiveTitle text={PROFILE_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={PROFILE_MESSAGES.pageDescription}
      />
      {view === null ? (
        <EmptyState
          icon={<UserRoundX className="size-10" />}
          title={PROFILE_MESSAGES.notFoundTitle}
          body={PROFILE_MESSAGES.errors.notFound}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <ProfileIdentity view={view} consoleUrl={accountConsoleUrl()} />
          </div>
          <section
            aria-labelledby="profile-form-title"
            className="glass flex flex-col gap-6 rounded-card p-6 xl:col-span-7"
          >
            <h2 id="profile-form-title" className="text-lg">
              {PROFILE_MESSAGES.formTitle}
            </h2>
            <ProfileForm view={view} />
          </section>
        </div>
      )}
    </>
  );
}
