// @vitest-environment node
import { describe, expect, it } from "vitest";

import { FacetKind } from "@/lib/enums/facet-kind";
import { humanizeKey, parseCategoryFacets, parseCategorySchema } from "@/lib/schemas/category";

/** Copy of the MONITOR schema seeded by the backend `ProductCategorySchemaInitializer`. */
const MONITOR_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    resolution: { type: "string", minLength: 1 },
    refreshRate: { type: "integer", minimum: 60 },
  },
  required: ["resolution", "refreshRate"],
});

describe("parseCategoryFacets", () => {
  it("turns a string enum into checkboxes", () => {
    const schema = JSON.stringify({
      type: "object",
      properties: { panel: { type: "string", title: "Dalle", enum: ["IPS", "VA", "OLED"] } },
    });
    expect(parseCategoryFacets(schema)).toEqual([
      { kind: FacetKind.ENUM, key: "panel", label: "Dalle", options: ["IPS", "VA", "OLED"] },
    ]);
  });

  it("turns number and integer properties into ranges with their bounds", () => {
    const schema = JSON.stringify({
      type: "object",
      properties: {
        weight: { type: "number", maximum: 5 },
        ram: { type: "integer", minimum: 8 },
      },
    });
    expect(parseCategoryFacets(schema)).toEqual([
      { kind: FacetKind.RANGE, key: "weight", label: "Weight", maximum: 5 },
      { kind: FacetKind.RANGE, key: "ram", label: "Ram", minimum: 8 },
    ]);
  });

  it("turns a boolean into a toggle", () => {
    const schema = JSON.stringify({ type: "object", properties: { touch: { type: "boolean" } } });
    expect(parseCategoryFacets(schema)).toEqual([
      { kind: FacetKind.BOOLEAN, key: "touch", label: "Touch" },
    ]);
  });

  it("ignores free-text strings and unknown types", () => {
    expect(parseCategoryFacets(MONITOR_SCHEMA)).toEqual([
      { kind: FacetKind.RANGE, key: "refreshRate", label: "Refresh rate", minimum: 60 },
    ]);
  });

  it("returns no facet for an unreadable schema", () => {
    expect(parseCategoryFacets("{not json")).toEqual([]);
    expect(parseCategoryFacets(JSON.stringify({ type: "array" }))).toEqual([]);
  });
});

describe("parseCategorySchema", () => {
  it("labels every property, filtered or not", () => {
    expect(parseCategorySchema(MONITOR_SCHEMA)?.labels).toEqual({
      resolution: "Resolution",
      refreshRate: "Refresh rate",
    });
  });

  it("returns null for an unreadable schema", () => {
    expect(parseCategorySchema("")).toBeNull();
  });
});

describe("humanizeKey", () => {
  it("splits camelCase and snake_case keys", () => {
    expect(humanizeKey("displayType")).toBe("Display type");
    expect(humanizeKey("refresh_rate")).toBe("Refresh rate");
    expect(humanizeKey("cpu")).toBe("Cpu");
  });
});
