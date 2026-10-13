"use client";

/**
 * « Tu regardais » strip of the home page: the products the visitor opened recently.
 *
 * Rendered only in the browser (the list lives in `localStorage`); without history or without
 * JavaScript it renders nothing. While the cards load, the shared card skeletons hold their
 * place (feature 002, FR-028).
 */
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { z } from "zod";

import { bffGet } from "@/lib/api/bff-client";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { ProductCardSchema } from "@/lib/schemas/product";
import { UUID_LIST_SEPARATOR } from "@/lib/schemas/uuid-list";

import { SectionHeading } from "@/components/layout/SectionHeading";

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { HOME_MESSAGES } from "../messages";

import { ProductGridSkeleton } from "./ProductCardSkeleton";
import { ProductGrid } from "./ProductGrid";

/** Body of `GET /api/products`. */
const ProductsResponseSchema = z.object({ products: z.array(ProductCardSchema) });

/**
 * Recently viewed products.
 *
 * @returns The section, or `null` when there is nothing to show.
 */
export function RecentlyViewed(): ReactNode {
  const uuids = useRecentlyViewed();
  const query = useQuery({
    queryKey: [QueryKey.RECENT_PRODUCTS, ...uuids],
    queryFn: ({ signal }) =>
      bffGet(
        BFF_ROUTES.products,
        new URLSearchParams({ [BACKEND_QUERY_PARAMS.uuids]: uuids.join(UUID_LIST_SEPARATOR) }),
        ProductsResponseSchema,
        signal,
      ),
    enabled: uuids.length > 0,
  });
  const products = query.data?.products ?? [];
  const isLoading = uuids.length > 0 && query.isPending;
  if (!isLoading && products.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="recently-viewed-title" className="flex flex-col gap-6">
      <SectionHeading id="recently-viewed-title">
        {HOME_MESSAGES.recentlyViewedTitle}
      </SectionHeading>
      {isLoading ? (
        <ProductGridSkeleton count={uuids.length} />
      ) : (
        <ProductGrid
          products={products}
          withTransition={false}
          label={HOME_MESSAGES.recentlyViewedTitle}
        />
      )}
    </section>
  );
}
