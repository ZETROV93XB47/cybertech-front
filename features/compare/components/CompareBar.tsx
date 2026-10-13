"use client";

/**
 * Comparison bar, fixed at the bottom of the catalog and of the product page (FR-015).
 *
 * Shows the selected products (cards from `GET /api/products`), a remove button per product,
 * « Tout effacer », an invitation with one product and « Comparer » from
 * {@link COMPARE_MIN_PRODUCTS}. As soon as the cards arrive, every selected product the catalog
 * no longer has is dropped with a message, without waiting for the modal (FR-021). A spacer of
 * the bar's height keeps the pagination visible, and a status region announces every change.
 * Nothing is rendered without JavaScript or with an empty selection.
 *
 * @see specs/002-catalog-refresh/research.md R10
 */
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { bffGet } from "@/lib/api/bff-client";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { COMPARE_MIN_PRODUCTS, COMPARE_QUERY_STALE_TIME_MS } from "@/lib/constants/compare";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { ProductCardSchema, type ProductCard } from "@/lib/schemas/product";
import { UUID_LIST_SEPARATOR } from "@/lib/schemas/uuid-list";
import { THEME } from "@/lib/theme/theme.config";

import { useCompareSelection } from "../hooks/useCompareSelection";
import { COMPARE_BAR_MESSAGES, COMPARE_DIALOG_MESSAGES } from "../messages";

import { CompareDialog } from "./CompareDialog";

/** Body of `GET /api/products`. */
const ProductsResponseSchema = z.object({ products: z.array(ProductCardSchema) });

/**
 * Loads the cards of the selected products and drops the ones the catalog no longer has.
 *
 * @param uuids - Selected product UUIDs.
 * @param remove - Removal action of the selection.
 * @returns The cards by UUID, once loaded.
 */
function useSelectedCards(
  uuids: readonly string[],
  remove: (uuids: readonly string[]) => boolean,
): ReadonlyMap<string, ProductCard> | undefined {
  const query = useQuery({
    queryKey: [QueryKey.COMPARE_PRODUCTS, ...uuids],
    queryFn: ({ signal }) =>
      bffGet(
        BFF_ROUTES.products,
        new URLSearchParams({ [BACKEND_QUERY_PARAMS.uuids]: uuids.join(UUID_LIST_SEPARATOR) }),
        ProductsResponseSchema,
        signal,
      ),
    staleTime: COMPARE_QUERY_STALE_TIME_MS,
    enabled: uuids.length > 0,
  });
  const products = query.data?.products;
  useEffect(() => {
    if (!products) {
      return;
    }
    const found = new Set(products.map((product) => product.uuid));
    const gone = uuids.filter((uuid) => !found.has(uuid));
    if (gone.length > 0 && remove(gone)) {
      toast(COMPARE_DIALOG_MESSAGES.removedProduct);
    }
  }, [products, uuids, remove]);
  return products && new Map(products.map((product) => [product.uuid, product]));
}

/**
 * One selected product: thumbnail, name and remove button.
 *
 * @param props - Product UUID, its card when loaded, and the removal action.
 * @returns The list item.
 */
function SelectedProduct({
  uuid,
  card,
  onRemove,
}: {
  readonly uuid: string;
  readonly card: ProductCard | undefined;
  readonly onRemove: (uuid: string) => void;
}): ReactNode {
  const name = card?.name ?? COMPARE_BAR_MESSAGES.loadingProduct;
  return (
    <li className="glass flex w-64 items-center gap-3 rounded-field p-2">
      <div className="aspect-4/3 w-16 shrink-0 overflow-hidden rounded-field bg-surface-2">
        {card ? (
          <ProductImage
            src={card.imageUrl}
            alt=""
            category={card.category}
            media={THEME.media.thumbnail}
            iconClassName="size-5"
          />
        ) : (
          <div aria-hidden className="skeleton-shimmer size-full" />
        )}
      </div>
      <span className="line-clamp-2 flex-1 text-xs text-text">{name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={COMPARE_BAR_MESSAGES.remove(name)}
        onClick={() => {
          onRemove(uuid);
        }}
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}

/**
 * Comparison bar of the page.
 *
 * @returns The live region, and the bar with its spacer when products are selected.
 */
export function CompareBar(): ReactNode {
  const { selection, remove, clear } = useCompareSelection();
  const uuids = selection?.uuids ?? [];
  const cards = useSelectedCards(uuids, remove);
  const count = uuids.length;
  return (
    <>
      <p role="status" className="sr-only">
        {count > 0 ? COMPARE_BAR_MESSAGES.count(count) : ""}
      </p>
      {count > 0 && (
        <>
          <div aria-hidden className="h-28" />
          <section
            aria-label={COMPARE_BAR_MESSAGES.label}
            className="fixed inset-x-0 bottom-0 z-30 px-6 pb-4"
          >
            <div className="glass mx-auto flex w-full max-w-site items-center gap-4 rounded-card p-3 shadow-card">
              <ul aria-label={COMPARE_BAR_MESSAGES.listLabel} className="flex flex-1 gap-3">
                {uuids.map((uuid) => (
                  <SelectedProduct
                    key={uuid}
                    uuid={uuid}
                    card={cards?.get(uuid)}
                    onRemove={(item) => remove([item])}
                  />
                ))}
              </ul>
              {count < COMPARE_MIN_PRODUCTS && (
                <p className="text-sm text-text-muted">{COMPARE_BAR_MESSAGES.invitation}</p>
              )}
              <Button type="button" variant="ghost" onClick={clear}>
                {COMPARE_BAR_MESSAGES.clear}
              </Button>
              {count >= COMPARE_MIN_PRODUCTS && <CompareDialog uuids={uuids} />}
            </div>
          </section>
        </>
      )}
    </>
  );
}
