/**
 * Home page (US1 FR-001, US3 FR-019): contextual or personal greeting, active offers, recently viewed products and
 * best sellers.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { MagneticButton } from "@/components/effects/MagneticButton";
import { buttonVariants } from "@/components/ui/button";
import { Welcome } from "@/features/auth/components/Welcome";
import { DiscountBanner } from "@/features/catalog/components/DiscountBanner";
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
        <Welcome className="text-5xl lg:text-6xl" />
        <p className="max-w-xl text-lg text-text-muted">{HOME_MESSAGES.intro}</p>
        <MagneticButton>
          <Link href={CATALOG_PATH} className={cn(buttonVariants({ size: "lg" }), "cta-gradient")}>
            {HOME_MESSAGES.searchCta}
          </Link>
        </MagneticButton>
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
