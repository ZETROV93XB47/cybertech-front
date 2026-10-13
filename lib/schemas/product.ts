/**
 * Product schemas: backend product, product card shown in lists, live availability.
 *
 * Every backend response is validated before use (constitution V).
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1
 * @see docs/backend/api-map.md D.12, D.12b
 */
import { z } from "zod";

import { LOW_STOCK_THRESHOLD } from "@/lib/constants/catalog";
import { AvailabilityLevel } from "@/lib/enums/availability-level";
import { Brand } from "@/lib/enums/brand";

/** `ProductResponseDto`. `uuid` is a `String` on the Java side but always holds a UUID. */
export const ProductSchema = z.object({
  uuid: z.uuid(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  brand: z.enum(Brand),
  category: z.string().min(1),
  photoUrls: z.array(z.url()),
  description: z.string(),
  attributes: z.record(z.string(), z.unknown()),
});

/** A product as returned by the backend. */
export type Product = z.infer<typeof ProductSchema>;

/** Compact product used by lists, the command palette and recently viewed products. */
export const ProductCardSchema = z.object({
  uuid: z.uuid(),
  name: z.string().min(1),
  brand: z.enum(Brand),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  imageUrl: z.url().nullable(),
});

/** Compact product used by lists. */
export type ProductCard = z.infer<typeof ProductCardSchema>;

/** `ProductAvailabilityDto`: live stock of one product (never cached). */
export const ProductAvailabilitySchema = z.object({
  productUuid: z.uuid(),
  availableStock: z.int().nonnegative(),
  inStock: z.boolean(),
});

/** Live stock of one product. */
export type ProductAvailability = z.infer<typeof ProductAvailabilitySchema>;

/**
 * Turns a backend product into a card: only the fields a list needs, first photo as image.
 *
 * @param product - Validated backend product.
 * @returns The card, with `imageUrl` set to `null` when the product has no photo.
 */
export function toProductCard(product: Product): ProductCard {
  return {
    uuid: product.uuid,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    imageUrl: product.photoUrls[0] ?? null,
  };
}

/**
 * Derives the availability label level from the live stock.
 *
 * @param availability - Live stock of the product.
 * @returns `OUT` without stock, `LOW` at or below {@link LOW_STOCK_THRESHOLD}, else `IN`.
 */
export function toAvailabilityLevel(availability: ProductAvailability): AvailabilityLevel {
  if (!availability.inStock || availability.availableStock === 0) {
    return AvailabilityLevel.OUT;
  }
  if (availability.availableStock <= LOW_STOCK_THRESHOLD) {
    return AvailabilityLevel.LOW;
  }
  return AvailabilityLevel.IN;
}
