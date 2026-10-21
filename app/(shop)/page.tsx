/**
 * Home page (US1 FR-001, US3 FR-019): contextual or personal greeting, the carousel of categories
 * and campaigns (feature 004 US3), category tiles, active offers, recently viewed products and
 * best sellers.
 *
 * Feature 002, US4: same template as the catalog (`PageShell`, `PageHeader` without breadcrumb,
 * `SectionHeading`, `EmptyState`); every block shows real data only and is hidden without data
 * (FR-029).
 *
 * @see specs/002-catalog-refresh/spec.md US4
 */
import { PackageSearch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Enter } from "@/components/effects/Enter";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Welcome } from "@/features/auth/components/Welcome";
import { CategoryTiles } from "@/features/catalog/components/CategoryTiles";
import { DiscountBanner } from "@/features/catalog/components/DiscountBanner";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { RecentlyViewed } from "@/features/catalog/components/RecentlyViewed";
import { HOME_MESSAGES } from "@/features/catalog/messages";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { HomeCarousel } from "@/features/home/components/HomeCarousel";
import { buildHomeSlides } from "@/features/home/home-slides";
import { getActiveCategories } from "@/lib/api/endpoints/categories";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { getCategoryCounts } from "@/lib/api/endpoints/facets";
import { getBestSellers, getCategoryPhotos } from "@/lib/api/endpoints/products";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { createModuleLogger } from "@/lib/logger";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import type { ProductCard } from "@/lib/schemas/product";

const log = createModuleLogger("catalog.home");

/** Position of each server-rendered section in the entrance cascade of the page. */
const HOME_SECTION_ORDER = {
  CATEGORIES: 0,
  OFFERS: 1,
  BEST_SELLERS: 2,
} as const;

/**
 * Loads the offers; they are a bonus, so a failure only hides the strip.
 *
 * @returns The displayable campaigns, empty on failure.
 */
async function loadDiscounts(): Promise<ActiveDiscount[]> {
  try {
    return await getActiveDiscounts();
  } catch {
    log.warn({}, "Active discounts not loaded; the offers strip is hidden");
    return [];
  }
}

/**
 * Best sellers, or the shared empty state while there is none.
 *
 * @param props - Best-selling products.
 * @returns The section.
 */
function BestSellers({ products }: { readonly products: readonly ProductCard[] }): ReactNode {
  return (
    <section aria-labelledby="best-sellers-title" className="flex flex-col gap-6">
      <SectionHeading id="best-sellers-title">{HOME_MESSAGES.bestSellersTitle}</SectionHeading>
      {products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="size-10" />}
          title={HOME_MESSAGES.emptyTitle}
          body={HOME_MESSAGES.emptyBody}
          action={{ href: CATALOG_PATH, label: COMMON_MESSAGES.goToCatalog }}
        />
      ) : (
        <ProductGrid products={products} label={HOME_MESSAGES.bestSellersTitle} />
      )}
    </section>
  );
}

/**
 * Home page.
 *
 * @returns Greeting, category tiles, offers, recently viewed products and best sellers.
 */
export default async function HomePage(): Promise<ReactNode> {
  const categories = await getActiveCategories();
  const [bestSellers, discounts, counts, photos] = await Promise.all([
    getBestSellers(),
    loadDiscounts(),
    getCategoryCounts(categories),
    getCategoryPhotos(categories),
  ]);
  return (
    <PageShell>
      <PageHeader
        title={<Welcome className={PAGE_TITLE_CLASS} />}
        subtitle={HOME_MESSAGES.intro}
        actions={
          <MagneticButton>
            <Link href={CATALOG_PATH} className={PRIMARY_CTA_CLASS}>
              {HOME_MESSAGES.searchCta}
            </Link>
          </MagneticButton>
        }
      />
      <HomeCarousel slides={buildHomeSlides(categories, counts, discounts)} />
      <Enter index={HOME_SECTION_ORDER.CATEGORIES}>
        <section aria-labelledby="categories-title" className="flex flex-col gap-6">
          <SectionHeading id="categories-title">{HOME_MESSAGES.categoriesTitle}</SectionHeading>
          <CategoryTiles categories={categories} counts={counts} photos={photos} />
        </section>
      </Enter>
      {discounts.length > 0 && (
        <Enter index={HOME_SECTION_ORDER.OFFERS}>
          <DiscountBanner discounts={discounts} />
        </Enter>
      )}
      <RecentlyViewed />
      <Enter index={HOME_SECTION_ORDER.BEST_SELLERS}>
        <BestSellers products={bestSellers} />
      </Enter>
    </PageShell>
  );
}
