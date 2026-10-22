/**
 * Product page (US1, FR-006 to FR-008, FR-010).
 *
 * Product data comes from the data cache (60 s); the stock is read live on the server for the
 * first paint and refreshed by the client badge. An unknown or malformed UUID shows the
 * « produit introuvable » page. The product can join the comparison (feature 002, US2), whose
 * bar is shown at the bottom of the page. A delivery block (fees from the backend, indicative
 * delays) and the customer reviews section complete the page.
 *
 * @see specs/001-catalog-auth-cart/spec.md US1
 * @see specs/004-catalog-promos-reviews/spec.md US1, US5
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { NavSectionMarker } from "@/components/layout/NavSectionMarker";
import { ProductBreadcrumb } from "@/features/catalog/components/ProductBreadcrumb";
import {
  ProductSpecs,
  ProductSummary,
  SimilarProducts,
} from "@/features/catalog/components/ProductDetails";
import { DeliveryInfo } from "@/features/catalog/components/DeliveryInfo";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import { ProductReviewsSection } from "@/features/catalog/components/ProductReviews";
import { RecordProductView } from "@/features/catalog/components/RecordProductView";
import { PRODUCT_MESSAGES } from "@/features/catalog/messages";
import { buildDeliveryLines, expressPromise } from "@/features/catalog/delivery";
import { buildProductSpecs } from "@/features/catalog/product-specs";
import { NO_REVIEWS, toProductReviews, type ProductReviews } from "@/features/catalog/reviews";
import { CompareBar } from "@/features/compare/components/CompareBar";
import { getCategorySchema } from "@/lib/api/endpoints/categories";
import { getActiveDiscounts } from "@/lib/api/endpoints/discounts";
import { getAvailability, getProductByUuid, searchProducts } from "@/lib/api/endpoints/products";
import { getProductReviews } from "@/lib/api/endpoints/reviews";
import { getShippingOptions } from "@/lib/api/endpoints/shipping";
import {
  META_DESCRIPTION_MAX_LENGTH,
  PRODUCT_HIGHLIGHTS_COUNT,
  SIMILAR_PRODUCTS_COUNT,
  SIMILAR_PRODUCTS_FETCH_SIZE,
} from "@/lib/constants/catalog";
import { SearchParam } from "@/lib/enums/search-param";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import { toCategoryKey } from "@/lib/schemas/category";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import type { Product, ProductAvailability, ProductCard } from "@/lib/schemas/product";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

/** Props given by Next.js to the page. */
interface ProductPageProps {
  readonly params: Promise<{ uuid: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const log = createModuleLogger("catalog.product-page");

/** First page of the reviews (0-based), read with the page; the next ones on request. */
const FIRST_REVIEWS_PAGE = 0;

/**
 * Bounds the `?photo=` parameter to the existing photos.
 *
 * @param value - Raw parameter.
 * @param count - Number of photos.
 * @returns A valid zero-based index (0 by default).
 */
function selectedPhoto(value: string | string[] | undefined, count: number): number {
  const index = Number(typeof value === "string" ? value : undefined);
  return Number.isInteger(index) && index >= 0 && index < count ? index : 0;
}

/**
 * Reads the stock for the first paint; a failure is not fatal, the badge retries on the client.
 *
 * @param uuid - Product UUID.
 * @returns The stock, `null` when unknown, `undefined` when it could not be read.
 */
async function readInitialAvailability(
  uuid: string,
): Promise<ProductAvailability | null | undefined> {
  try {
    const [availability] = await getAvailability([uuid]);
    return availability ?? null;
  } catch {
    log.warn({}, "Initial availability not loaded; the client badge will retry");
    return undefined;
  }
}

/**
 * Labels of the category attributes; none when the category is unknown.
 *
 * @param product - The product.
 * @returns Labels by attribute key.
 */
async function categoryLabels(product: Product): Promise<Readonly<Record<string, string>>> {
  const category = toCategoryKey(product.category);
  return category === undefined ? {} : (await getCategorySchema(category)).labels;
}

/**
 * Title and description of the page.
 *
 * @param props - Page props.
 * @returns The metadata (not-found title when the product does not exist).
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductByUuid((await params).uuid);
  if (!product) {
    return { title: PRODUCT_MESSAGES.notFoundTitle };
  }
  return {
    title: product.name,
    description: product.description.slice(0, META_DESCRIPTION_MAX_LENGTH),
  };
}

/**
 * Loads the current discount campaign; a bonus, so a failure only hides the offer.
 *
 * @returns The first displayable campaign, if any.
 */
async function loadOffer(): Promise<ActiveDiscount | undefined> {
  try {
    return (await getActiveDiscounts())[0];
  } catch {
    log.warn({}, "Active discounts not loaded; the offer block is hidden");
    return undefined;
  }
}

/**
 * Loads the first page of the reviews; on failure the section says there is no review yet
 * rather than inventing a figure (FR-020).
 *
 * @param productUuid - Product shown.
 * @returns The reviews, or {@link NO_REVIEWS}.
 */
async function loadReviews(productUuid: string): Promise<ProductReviews> {
  try {
    return toProductReviews(await getProductReviews(productUuid, FIRST_REVIEWS_PAGE));
  } catch {
    log.warn(
      { productUuid: maskUuid(productUuid) },
      "Product reviews not loaded; empty state shown",
    );
    return NO_REVIEWS;
  }
}

/**
 * Keeps one card per model name, without the product shown: the catalog can hold the same
 * model twice under different UUIDs.
 *
 * @param cards - Search results.
 * @param product - The product shown.
 * @returns The cards, in order, one per name.
 */
function distinctByName(cards: readonly ProductCard[], product: Product): ProductCard[] {
  const seen = new Set([product.name]);
  const kept: ProductCard[] = [];
  for (const card of cards) {
    if (!seen.has(card.name)) {
      seen.add(card.name);
      kept.push(card);
    }
  }
  return kept;
}

/**
 * Loads a few products of the same category; a bonus, so a failure only hides the section.
 *
 * @param product - The product shown.
 * @returns Up to {@link SIMILAR_PRODUCTS_COUNT} other products.
 */
async function loadSimilar(product: Product): Promise<ProductCard[]> {
  const category = toCategoryKey(product.category);
  if (!category) {
    return [];
  }
  try {
    const page = await searchProducts(
      { ...EMPTY_SEARCH_FILTERS, category },
      SIMILAR_PRODUCTS_FETCH_SIZE,
    );
    return distinctByName(page.content, product).slice(0, SIMILAR_PRODUCTS_COUNT);
  } catch {
    log.warn({}, "Similar products not loaded; the section is hidden");
    return [];
  }
}

/**
 * Product page.
 *
 * @param props - Page props.
 * @returns Breadcrumb, gallery, summary, technical sheet, description and similar products.
 */
export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps): Promise<ReactNode> {
  const product = await getProductByUuid((await params).uuid);
  if (!product) {
    notFound();
  }
  const [labels, availability, offer, similar, shippingOptions, reviews] = await Promise.all([
    categoryLabels(product),
    readInitialAvailability(product.uuid),
    loadOffer(),
    loadSimilar(product),
    getShippingOptions(),
    loadReviews(product.uuid),
  ]);
  const specs = buildProductSpecs(product.attributes, labels);
  const photo = selectedPhoto((await searchParams)[SearchParam.PHOTO], product.photoUrls.length);
  return (
    <article className="mx-auto flex w-full max-w-site flex-col gap-12 px-6 pt-10 pb-24">
      <RecordProductView productUuid={product.uuid} />
      <NavSectionMarker category={toCategoryKey(product.category)} />
      <ProductBreadcrumb category={toCategoryKey(product.category)} brand={product.brand} />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery product={product} selected={photo} />
        </div>
        <div className="flex flex-col gap-8 lg:col-span-5">
          <ProductSummary
            product={product}
            highlights={specs.slice(0, PRODUCT_HIGHLIGHTS_COUNT)}
            offer={offer}
            availability={availability}
          />
          <DeliveryInfo
            lines={buildDeliveryLines(shippingOptions)}
            promise={expressPromise(new Date())}
          />
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="description-title" className="flex flex-col gap-4 lg:col-span-5">
          <h2 id="description-title" className="text-xl">
            {PRODUCT_MESSAGES.descriptionTitle}
          </h2>
          <p className="whitespace-pre-line text-text-muted">{product.description}</p>
        </section>
        <div className="lg:col-span-7">
          <ProductSpecs specs={specs} />
        </div>
      </div>
      <ProductReviewsSection productUuid={product.uuid} reviews={reviews} />
      <SimilarProducts products={similar} />
      <CompareBar />
    </article>
  );
}
