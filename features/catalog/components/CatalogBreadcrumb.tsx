/**
 * Breadcrumb of the catalog: Accueil › Catalogue › category (FR-028). The last step is the
 * current page and is not a link.
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import type { CategoryKey } from "@/lib/enums/category-key";

import { CATALOG_BREADCRUMB_MESSAGES, CATEGORY_LABELS, LIST_MESSAGES } from "../messages";

/** Style of a breadcrumb link. */
const CRUMB = "text-text-muted transition-colors duration-(--duration-fast) hover:text-text";

/** Props of {@link CatalogBreadcrumb}. */
export interface CatalogBreadcrumbProps {
  /** Selected category, if any. */
  readonly category: CategoryKey | undefined;
}

/**
 * Breadcrumb navigation.
 *
 * @param props - Selected category.
 * @returns The navigation landmark.
 */
export function CatalogBreadcrumb({ category }: CatalogBreadcrumbProps): ReactNode {
  const steps = [
    { href: HOME_PATH, label: CATALOG_BREADCRUMB_MESSAGES.home },
    { href: CATALOG_PATH, label: LIST_MESSAGES.title },
    ...(category ? [{ href: null, label: CATEGORY_LABELS[category] }] : []),
  ];
  const last = steps.length - 1;
  return (
    <nav aria-label={CATALOG_BREADCRUMB_MESSAGES.label}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {steps.map((step, index) => (
          <li key={step.label} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight aria-hidden className="size-3.5 text-text-muted" />}
            {index === last || step.href === null ? (
              <span aria-current="page" className="text-text">
                {step.label}
              </span>
            ) : (
              <Link href={step.href} className={CRUMB}>
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
