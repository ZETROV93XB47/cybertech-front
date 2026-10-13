/**
 * Backend product fixtures (`ProductResponseDto`, `PagedModel`, `ErrorResponseDto`) shared by
 * the catalog tests.
 */
export const PRODUCT_UUID = "01a0fcee-1a28-7e24-bba6-f22aa380ce32";

export function backendProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uuid: PRODUCT_UUID,
    name: "Microsoft Surface Go 4",
    price: 729,
    brand: "MICROSOFT",
    category: "COMPUTER",
    photoUrls: ["http://localhost:4566/cybertech-products/surface_0.jpg"],
    description: "Tablette hybride.",
    attributes: { cpu: "Intel N200", ram: 8, memory: 64 },
    ...overrides,
  };
}

export function backendPage(content: readonly unknown[]): Record<string, unknown> {
  return {
    content,
    page: { size: content.length, number: 0, totalElements: content.length, totalPages: 1 },
  };
}

export const PRODUCT_NOT_FOUND_BODY = {
  message: "Product not found",
  httpStatusCode: 404,
  errorCodeType: "FUNCTIONAL",
  errorCode: "PRODUCT_NOT_FOUND",
};

/** Builds `count` distinct, valid UUIDs. */
export function fakeUuids(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
}
