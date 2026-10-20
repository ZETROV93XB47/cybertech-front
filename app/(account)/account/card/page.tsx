/**
 * « Ma carte » (feature 003 US5): the saved card, masked, with its edit, replacement and
 * deletion, or « Ajouter une carte » when there is none. Read on the server with the user's
 * token, never cached; shown in the account shell. `?returnTo=` (from the checkout) is checked
 * with `safeCallbackPath` and followed once a card is saved.
 *
 * @see specs/003-account-orders/spec.md US5, FR-031, FR-032
 * @see specs/003-account-orders/research.md R17, R21
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { expiryMonthOptions, expiryYearOptions, toCardView } from "@/features/account/card-view";
import { BankCardPanel } from "@/features/account/components/BankCardPanel";
import { CARD_MESSAGES } from "@/features/account/messages";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { getBankCard } from "@/lib/api/endpoints/bank-card";
import { safeCallbackPath } from "@/lib/auth/callback-url";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { ACCOUNT_PATHS, CARD_RETURN_PARAM, HOME_PATH } from "@/lib/constants/routes";
import { getEnv } from "@/lib/env";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: CARD_MESSAGES.metaTitle,
  description: CARD_MESSAGES.pageDescription,
  robots: { index: false },
};

/** Props of the card page. */
interface CardPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Safe path to go back to after a card is saved.
 *
 * @param raw - Value of `?returnTo=`.
 * @returns The same-origin relative path, or `null` when absent or unsafe.
 */
function returnPath(raw: string | string[] | undefined): string | null {
  if (typeof raw !== "string" || raw === "") {
    return null;
  }
  const path = safeCallbackPath(raw, getEnv().AUTH_URL);
  return path === HOME_PATH ? null : path;
}

/**
 * Card page.
 *
 * @param props - Page props.
 * @param props.searchParams - Query string, read for `?returnTo=`.
 * @returns Header and card panel.
 * @throws {ApiError} When the backend cannot read the card (error boundary).
 */
export default async function CardPage({ searchParams }: CardPageProps): Promise<ReactNode> {
  const accessToken = await getAccessTokenOrRedirect(ACCOUNT_PATHS.card);
  const [card, params] = await Promise.all([getBankCard(accessToken), searchParams]);
  const view = card === null ? null : toCardView(card);
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: CARD_MESSAGES.pageTitle },
            ]}
          />
        }
        title={<LiveTitle text={CARD_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={CARD_MESSAGES.pageDescription}
      />
      <BankCardPanel
        card={view}
        returnTo={returnPath(params[CARD_RETURN_PARAM])}
        months={expiryMonthOptions()}
        years={expiryYearOptions(new Date(), view?.expiryYear)}
      />
    </>
  );
}
