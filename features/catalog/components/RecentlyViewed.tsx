"use client";

/**
 * « Tu regardais » strip of the home page: the products the visitor opened recently.
 *
 * Rendered only in the browser (the list lives in `localStorage`); without history or without
 * JavaScript it renders nothing.
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

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { HOME_MESSAGES } from "../messages";

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
  if (products.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="recently-viewed-title" className="flex flex-col gap-6">
      <h2 id="recently-viewed-title" className="text-2xl">
        {HOME_MESSAGES.recentlyViewedTitle}
      </h2>
      <ProductGrid
        products={products}
        withTransition={false}
        label={HOME_MESSAGES.recentlyViewedTitle}
      />
    </section>
  );
}
