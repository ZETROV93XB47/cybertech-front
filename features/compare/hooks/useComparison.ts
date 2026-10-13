/**
 * Comparison view of the modal, loaded from `GET /api/compare` only while the modal is open.
 *
 * Second safety net for products that disappeared from the catalog: the bar already drops them
 * as soon as it loads (FR-021); any UUID still reported in `missing` here is dropped too, with
 * the same message, shown once since a second removal finds nothing to remove.
 *
 * @see specs/002-catalog-refresh/research.md R11
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { bffGet } from "@/lib/api/bff-client";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { COMPARE_QUERY_STALE_TIME_MS } from "@/lib/constants/compare";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { ComparisonViewSchema, type ComparisonView } from "@/lib/schemas/compare";
import { UUID_LIST_SEPARATOR } from "@/lib/schemas/uuid-list";

import { COMPARE_DIALOG_MESSAGES } from "../messages";

import { useCompareSelection } from "./useCompareSelection";

/**
 * Loads the comparison of the selected products.
 *
 * @param uuids - Selected product UUIDs, in insertion order.
 * @param enabled - `true` while the modal is open.
 * @returns The TanStack Query result.
 */
export function useComparison(
  uuids: readonly string[],
  enabled: boolean,
): UseQueryResult<ComparisonView> {
  const { remove } = useCompareSelection();
  const query = useQuery({
    queryKey: [QueryKey.COMPARE, ...uuids],
    queryFn: ({ signal }) =>
      bffGet(
        BFF_ROUTES.compare,
        new URLSearchParams({ [BACKEND_QUERY_PARAMS.uuids]: uuids.join(UUID_LIST_SEPARATOR) }),
        ComparisonViewSchema,
        signal,
      ),
    staleTime: COMPARE_QUERY_STALE_TIME_MS,
    enabled: enabled && uuids.length > 0,
  });
  const missing = query.data?.missing;
  useEffect(() => {
    if (missing && missing.length > 0 && remove(missing)) {
      toast(COMPARE_DIALOG_MESSAGES.removedProduct);
    }
  }, [missing, remove]);
  return query;
}
