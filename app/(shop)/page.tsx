/**
 * Home page (US1, FR-001): contextual greeting, active offers, recently viewed products and
 * best sellers.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { DiscountBanner } from "@/features/catalog/components/DiscountBanner";
import { Greeting } from "@/features/catalog/components/Greeting";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { RecentlyViewed } from "@/features/catalog/components/RecentlyViewed";
import { HOME_MESSAGES } from "@/features/catalog/messages";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { getBestSellers } from "@/lib/api/endpoints/products";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { createModuleLogger } from "@/lib/logger";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import { cn } from "@/lib/utils";

const log = createModuleLogger("catalog.home");

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
 * Home page.
 *
 * @returns Greeting, offers, recently viewed products and best sellers.
 */
export default async function HomePage(): Promise<ReactNode> {
  const [bestSellers, discounts] = await Promise.all([getBestSellers(), loadDiscounts()]);
  return (
    <div className="mx-auto flex w-full max-w-site flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-start gap-6">
        <Greeting className="text-5xl lg:text-6xl" />
        <p className="max-w-xl text-lg text-text-muted">{HOME_MESSAGES.intro}</p>
        <Link href={CATALOG_PATH} className={cn(buttonVariants({ size: "lg" }), "cta-gradient")}>
          {HOME_MESSAGES.searchCta}
        </Link>
      </section>
      <DiscountBanner discounts={discounts} />
      <RecentlyViewed />
      <section aria-labelledby="best-sellers-title" className="flex flex-col gap-6">
        <h2 id="best-sellers-title" className="text-2xl">
          {HOME_MESSAGES.bestSellersTitle}
        </h2>
        {bestSellers.length === 0 ? (
          <p className="text-text-muted">{HOME_MESSAGES.bestSellersEmpty}</p>
        ) : (
          <ProductGrid products={bestSellers} label={HOME_MESSAGES.bestSellersTitle} />
        )}
      </section>
    </div>
  );
}
