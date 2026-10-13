/**
 * Product page (US1, FR-006 to FR-008, FR-010).
 *
 * Product data comes from the data cache (60 s); the stock is read live on the server for the
 * first paint and refreshed by the client badge. An unknown or malformed UUID shows the
 * « produit introuvable » page.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { AvailabilityBadge } from "@/features/catalog/components/AvailabilityBadge";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import { RecordProductView } from "@/features/catalog/components/RecordProductView";
import { BRAND_LABELS, PRODUCT_MESSAGES } from "@/features/catalog/messages";
import { buildProductSpecs } from "@/features/catalog/product-specs";
import { getCategorySchema } from "@/lib/api/endpoints/categories";
import { getAvailability, getProductByUuid } from "@/lib/api/endpoints/products";
import { META_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/catalog";
import { SearchParam } from "@/lib/enums/search-param";
import { formatPrice } from "@/lib/format";
import { createModuleLogger } from "@/lib/logger";
import { toCategoryKey } from "@/lib/schemas/category";
import type { ProductAvailability, Product } from "@/lib/schemas/product";

/** Props given by Next.js to the page. */
interface ProductPageProps {
  readonly params: Promise<{ uuid: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const log = createModuleLogger("catalog.product-page");

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
 * Product page.
 *
 * @param props - Page props.
 * @returns Gallery, price, stock, technical sheet and description.
 */
export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps): Promise<ReactNode> {
  const product = await getProductByUuid((await params).uuid);
  if (!product) {
    notFound();
  }
  const [labels, availability] = await Promise.all([
    categoryLabels(product),
    readInitialAvailability(product.uuid),
  ]);
  const specs = buildProductSpecs(product.attributes, labels);
  const photo = selectedPhoto((await searchParams)[SearchParam.PHOTO], product.photoUrls.length);
  return (
    <article className="mx-auto flex w-full max-w-site flex-col gap-12 px-6 py-10">
      <RecordProductView productUuid={product.uuid} />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery product={product} selected={photo} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">
              <span className="sr-only">{PRODUCT_MESSAGES.brandLabel} : </span>
              {BRAND_LABELS[product.brand]}
            </p>
            <h1 className="text-3xl leading-tight">{product.name}</h1>
          </div>
          <p className="price text-3xl">{formatPrice(product.price)}</p>
          <AvailabilityBadge
            productUuid={product.uuid}
            {...(availability === undefined ? {} : { initialAvailability: availability })}
          />
          <AddToCartButton productUuid={product.uuid} productName={product.name} />
          {specs.length > 0 && (
            <section
              aria-labelledby="specs-title"
              className="glass flex flex-col gap-4 rounded-card p-6"
            >
              <h2 id="specs-title" className="text-lg">
                {PRODUCT_MESSAGES.specsTitle}
              </h2>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
                {specs.map((spec) => (
                  <div key={spec.key} className="contents">
                    <dt className="text-text-muted">{spec.label}</dt>
                    <dd className="col-span-2 text-text">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
      <section aria-labelledby="description-title" className="flex max-w-prose flex-col gap-4">
        <h2 id="description-title" className="text-xl">
          {PRODUCT_MESSAGES.descriptionTitle}
        </h2>
        <p className="whitespace-pre-line text-text-muted">{product.description}</p>
      </section>
    </article>
  );
}
