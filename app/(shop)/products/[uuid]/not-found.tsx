/**
 * « Produit introuvable » page (FR-008), shown for an unknown or malformed product UUID.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_MESSAGES } from "@/features/catalog/messages";
import { CATALOG_PATH } from "@/lib/constants/routes";

/**
 * Product not found.
 *
 * @returns The message and a link back to the catalog.
 */
export default function ProductNotFound(): ReactNode {
  return (
    <section className="mx-auto flex w-full max-w-site flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-3xl">{PRODUCT_MESSAGES.notFoundTitle}</h1>
      <p className="max-w-prose text-text-muted">{PRODUCT_MESSAGES.notFoundBody}</p>
      <Link href={CATALOG_PATH} className={buttonVariants()}>
        {PRODUCT_MESSAGES.backToCatalog}
      </Link>
    </section>
  );
}
