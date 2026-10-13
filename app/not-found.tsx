/**
 * Page shown for an unknown URL, with a way back to the catalog.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { CATALOG_PATH } from "@/lib/constants/routes";

/**
 * Not-found page.
 *
 * @returns The message and a link to the catalog.
 */
export default function NotFound(): ReactNode {
  return (
    <section className="mx-auto flex w-full max-w-site flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-3xl">{COMMON_MESSAGES.notFoundTitle}</h1>
      <p className="max-w-prose text-text-muted">{COMMON_MESSAGES.notFoundBody}</p>
      <Link href={CATALOG_PATH} className={buttonVariants()}>
        {COMMON_MESSAGES.goToCatalog}
      </Link>
    </section>
  );
}
