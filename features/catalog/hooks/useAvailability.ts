/**
 * Live availability of one product on the client (FR-007).
 *
 * Never cached for long: `staleTime: 0` and a refetch when the window regains focus, because the
 * stock can change at any time. Requests of the same render are batched by
 * {@link createAvailabilityLoader}.
 *
 * @see specs/001-catalog-auth-cart/research.md R6
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import { bffGet } from "@/lib/api/bff-client";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { ProductAvailabilitySchema, type ProductAvailability } from "@/lib/schemas/product";
import { UUID_LIST_SEPARATOR } from "@/lib/schemas/uuid-list";

import { createAvailabilityLoader } from "../availability-batcher";

/** Body of `GET /api/availability`. */
const AvailabilityResponseSchema = z.object({ items: z.array(ProductAvailabilitySchema) });

/** Loader shared by every badge of the tab. */
const loadAvailability = createAvailabilityLoader(async (uuids) => {
  const params = new URLSearchParams({
    [BACKEND_QUERY_PARAMS.uuids]: uuids.join(UUID_LIST_SEPARATOR),
  });
  const body = await bffGet(BFF_ROUTES.availability, params, AvailabilityResponseSchema);
  return body.items;
});

/**
 * Builds the query key of a product's availability.
 *
 * @param uuid - Product UUID.
 * @returns The key `["availability", uuid]`.
 */
export function availabilityQueryKey(uuid: string): readonly [QueryKey.AVAILABILITY, string] {
  return [QueryKey.AVAILABILITY, uuid];
}

/**
 * Reads the live stock of a product.
 *
 * @param uuid - Product UUID.
 * @param initialData - Stock read on the server with the page, shown until the first refetch.
 * @returns The query; `data` is `null` when the backend does not know the product.
 */
export function useAvailability(
  uuid: string,
  initialData?: ProductAvailability | null,
): UseQueryResult<ProductAvailability | null> {
  return useQuery({
    queryKey: availabilityQueryKey(uuid),
    queryFn: () => loadAvailability(uuid),
    staleTime: 0,
    refetchOnWindowFocus: true,
    ...(initialData === undefined ? {} : { initialData }),
  });
}
