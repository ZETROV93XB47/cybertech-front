// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { buildComparisonView } from "@/lib/api/compare";
import { CategoryKey } from "@/lib/enums/category-key";

import { PRODUCT_NOT_FOUND_BODY, backendProduct, fakeUuids } from "../../helpers/products";
import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const API = `${TEST_BACKEND_URL}/api/v1/services`;

const [A = "", B = "", C = "", UNKNOWN = ""] = fakeUuids(4);

/** COMPUTER schema of the backend, reduced to the properties used here. */
const COMPUTER_SCHEMA = {
  uuid: "0193a2b4-1111-7222-8333-000000000001",
  categoryKey: "COMPUTER",
  label: "Ordinateur",
  active: true,
  jsonSchema: JSON.stringify({
    type: "object",
    properties: {
      cpu: { type: "string" },
      ram: { type: "integer", minimum: 8 },
      connectivity: { type: "string" },
    },
  }),
};

/**
 * Serves products and the COMPUTER schema.
 *
 * @param products - Backend products by UUID; other UUIDs answer 404.
 * @param schemaStatus - Status of the schema endpoint (404 when the schema is missing).
 */
function serve(products: Record<string, Record<string, unknown>>, schemaStatus = 200): void {
  server.use(
    http.get(`${API}/product/get/:uuid`, ({ params }) => {
      const product = products[String(params.uuid)];
      return product
        ? HttpResponse.json(product)
        : HttpResponse.json(PRODUCT_NOT_FOUND_BODY, { status: 404 });
    }),
    http.get(`${API}/product-category-schemas/:key`, () =>
      schemaStatus === 200
        ? HttpResponse.json(COMPUTER_SCHEMA)
        : HttpResponse.json(PRODUCT_NOT_FOUND_BODY, { status: schemaStatus }),
    ),
  );
}

const computer = (uuid: string, attributes: Record<string, unknown>): Record<string, unknown> =>
  backendProduct({ uuid, name: `PC ${uuid.slice(-2)}`, attributes });

describe("buildComparisonView", () => {
  it("keeps the request order and aligns one value per product on schema rows", async () => {
    serve({
      [A]: computer(A, { cpu: "AMD Ryzen 7", ram: 16, connectivity: "Wi-Fi 6E", color: "Noir" }),
      [B]: computer(B, { cpu: "AMD Ryzen 7", ram: 32 }),
    });
    const view = await buildComparisonView([B, A]);
    expect(view.category).toBe(CategoryKey.COMPUTER);
    expect(view.products.map((product) => product.uuid)).toEqual([B, A]);
    expect(view.missing).toEqual([]);
    expect(view.rows).toEqual([
      { key: "cpu", label: "Processeur", values: ["AMD Ryzen 7", "AMD Ryzen 7"], differs: false },
      { key: "ram", label: "Mémoire vive", values: ["32 Go", "16 Go"], differs: true },
      { key: "connectivity", label: "Connectique", values: [null, "Wi-Fi 6E"], differs: true },
      { key: "color", label: "Color", values: [null, "Noir"], differs: true },
    ]);
  });

  it("puts unknown products in missing", async () => {
    serve({ [A]: computer(A, { cpu: "X" }) });
    const view = await buildComparisonView([A, UNKNOWN]);
    expect(view.products.map((product) => product.uuid)).toEqual([A]);
    expect(view.missing).toEqual([UNKNOWN]);
  });

  it("returns an empty view when no product is found", async () => {
    serve({});
    const view = await buildComparisonView([A, B]);
    expect(view).toEqual({ category: null, products: [], rows: [], missing: [A, B] });
  });

  it("keeps the majority category of a tampered selection", async () => {
    serve({
      [A]: backendProduct({ uuid: A, category: "MONITOR", attributes: {} }),
      [B]: computer(B, { cpu: "X" }),
      [C]: computer(C, { cpu: "Y" }),
    });
    const view = await buildComparisonView([A, B, C]);
    expect(view.category).toBe(CategoryKey.COMPUTER);
    expect(view.products.map((product) => product.uuid)).toEqual([B, C]);
    expect(view.missing).toEqual([A]);
  });

  it("keeps the category of the first product on a tie", async () => {
    serve({
      [A]: backendProduct({ uuid: A, category: "MONITOR", attributes: {} }),
      [B]: computer(B, { cpu: "X" }),
    });
    const view = await buildComparisonView([A, B]);
    expect(view.category).toBe(CategoryKey.MONITOR);
    expect(view.missing).toEqual([B]);
  });

  it("labels rows from the keys and warns when the schema is missing", async () => {
    serve({ [A]: computer(A, { cpu: "X", diskType: "SSD" }), [B]: computer(B, { cpu: "X" }) }, 404);
    const view = await buildComparisonView([A, B]);
    expect(view.rows.map((row) => row.label)).toEqual(["Processeur", "Disk type"]);
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ category: CategoryKey.COMPUTER }),
      expect.stringContaining("schema"),
    );
  });

  it("logs counts with masked UUIDs only", async () => {
    serve({ [A]: computer(A, { cpu: "X" }) });
    await buildComparisonView([A, UNKNOWN]);
    expect(testLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ requested: 2, found: 1, missing: 1 }),
      expect.any(String),
    );
    expect(JSON.stringify(testLogger.info.mock.calls)).not.toContain(UNKNOWN);
  });
});
