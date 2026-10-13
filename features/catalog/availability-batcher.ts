/**
 * Groups the availability requests of one render into a single BFF call.
 *
 * A product grid mounts one badge per card; each badge asks for one UUID. Requests made in the
 * same task are collected and sent together (split into calls of
 * {@link AVAILABILITY_MAX_UUIDS_PER_REQUEST}), so a 24-card page costs one request, not 24.
 *
 * @see specs/001-catalog-auth-cart/research.md R6
 */
import { AVAILABILITY_MAX_UUIDS_PER_REQUEST } from "@/lib/constants/cart";
import type { ProductAvailability } from "@/lib/schemas/product";

/** Loads the availability of a list of products (at most 50 UUIDs per call). */
export type AvailabilityFetcher = (
  uuids: readonly string[],
) => Promise<readonly ProductAvailability[]>;

/** Loads the availability of one product; `null` when the product is unknown to the backend. */
export type AvailabilityLoader = (uuid: string) => Promise<ProductAvailability | null>;

/** A caller waiting for one UUID. */
interface PendingRequest {
  readonly resolve: (availability: ProductAvailability | null) => void;
  readonly reject: (reason: unknown) => void;
}

/**
 * Sends one chunk and settles its waiting callers.
 *
 * @param fetcher - BFF call.
 * @param batch - Waiting callers of this chunk, by UUID.
 */
async function flushChunk(
  fetcher: AvailabilityFetcher,
  batch: ReadonlyMap<string, readonly PendingRequest[]>,
): Promise<void> {
  try {
    const items = await fetcher([...batch.keys()]);
    const byUuid = new Map(items.map((item) => [item.productUuid, item]));
    for (const [uuid, waiting] of batch) {
      waiting.forEach((request) => {
        request.resolve(byUuid.get(uuid) ?? null);
      });
    }
  } catch (error) {
    batch.forEach((waiting) => {
      waiting.forEach((request) => {
        request.reject(error);
      });
    });
  }
}

/**
 * Creates a batching loader.
 *
 * @param fetcher - Function calling the BFF for a list of UUIDs.
 * @returns A loader to call once per product.
 */
export function createAvailabilityLoader(fetcher: AvailabilityFetcher): AvailabilityLoader {
  let pending = new Map<string, PendingRequest[]>();
  const flush = (): void => {
    const batch = [...pending];
    pending = new Map();
    for (let start = 0; start < batch.length; start += AVAILABILITY_MAX_UUIDS_PER_REQUEST) {
      void flushChunk(
        fetcher,
        new Map(batch.slice(start, start + AVAILABILITY_MAX_UUIDS_PER_REQUEST)),
      );
    }
  };
  return (uuid) =>
    new Promise((resolve, reject) => {
      if (pending.size === 0) {
        setTimeout(flush);
      }
      pending.set(uuid, [...(pending.get(uuid) ?? []), { resolve, reject }]);
    });
}
