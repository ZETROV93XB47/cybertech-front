/**
 * Breadcrumb of a product page: Catalogue › category › brand, each step opening the list
 * already filtered (real catalog data, no invented navigation).
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import type { Brand } from "@/lib/enums/brand";
import type { CategoryKey } from "@/lib/enums/category-key";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import {
  BRAND_LABELS,
  CATALOG_BREADCRUMB_MESSAGES,
  CATEGORY_LABELS,
  LIST_MESSAGES,
  PRODUCT_MESSAGES,
} from "../messages";
import { buildSearchUrl } from "../search-params";

/** Props of {@link ProductBreadcrumb}. */
export interface ProductBreadcrumbProps {
  readonly category: CategoryKey | undefined;
  readonly brand: Brand;
}

/** Style of a breadcrumb link. */
const CRUMB = "text-text-muted transition-colors duration-(--duration-fast) hover:text-text";

/**
 * Breadcrumb.
 *
 * @param props - Category (when known) and brand of the product.
 * @returns The navigation landmark.
 */
export function ProductBreadcrumb({ category, brand }: ProductBreadcrumbProps): ReactNode {
  const steps: { href: string; label: string }[] = [
    { href: HOME_PATH, label: CATALOG_BREADCRUMB_MESSAGES.home },
    { href: CATALOG_PATH, label: LIST_MESSAGES.title },
  ];
  if (category) {
    steps.push({
      href: buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category }),
      label: CATEGORY_LABELS[category],
    });
  }
  steps.push({
    href: buildSearchUrl({
      ...EMPTY_SEARCH_FILTERS,
      ...(category ? { category } : {}),
      brands: [brand],
    }),
    label: BRAND_LABELS[brand],
  });
  return (
    <nav aria-label={PRODUCT_MESSAGES.breadcrumbLabel}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {steps.map((step, index) => (
          <li key={step.href} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight aria-hidden className="size-3.5 text-text-muted" />}
            <Link href={step.href} className={CRUMB}>
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
