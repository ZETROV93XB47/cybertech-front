/**
 * Category schema (`ProductCategorySchemaResponseDto`) and the filters derived from it.
 *
 * The backend describes the `attributes` of each category with a JSON Schema sent as a string.
 * The front reads its `properties` to build the catalog filters (facets) and the labels of the
 * technical sheet, so a new attribute added by an admin appears without a front release.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 CategorySchema
 * @see docs/backend/api-map.md §4, D.13
 */
import { z } from "zod";

import { assertNever } from "@/lib/assert-never";
import { CategoryKey } from "@/lib/enums/category-key";
import { FacetKind } from "@/lib/enums/facet-kind";

/** `ProductCategorySchemaResponseDto`. */
export const CategorySchemaResponseSchema = z.object({
  uuid: z.uuid(),
  categoryKey: z.string().min(1),
  label: z.string(),
  jsonSchema: z.string(),
  active: z.boolean(),
});

/** A category schema as returned by the backend. */
export type CategorySchemaResponse = z.infer<typeof CategorySchemaResponseSchema>;

/** Schema of a category key. */
const CategoryKeySchema = z.enum(CategoryKey);

/**
 * Reads a category key from free text (URL, `ProductResponseDto.category`).
 *
 * @param value - Raw value.
 * @returns The category key, or `undefined` when the front does not know this category.
 */
export function toCategoryKey(value: string | undefined): CategoryKey | undefined {
  return CategoryKeySchema.safeParse(value).data;
}

/** JSON Schema type names the front turns into filters. */
enum JsonSchemaType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

/** The subset of a JSON Schema property the front reads; other keywords are ignored. */
const JsonSchemaPropertySchema = z.object({
  /** Unknown types become `undefined`: the property is then neither filtered nor rejected. */
  type: z.enum(JsonSchemaType).optional().catch(undefined),
  title: z.string().min(1).optional(),
  enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
});

/** Root of a category JSON Schema: an object with named properties. */
const JsonSchemaRootSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), JsonSchemaPropertySchema),
});

/** One JSON Schema property, as read by the front. */
type JsonSchemaProperty = z.infer<typeof JsonSchemaPropertySchema>;

/** Filter on one category attribute. */
export type CategoryFacet =
  | {
      readonly kind: FacetKind.TEXT;
      readonly key: string;
      readonly label: string;
    }
  | {
      readonly kind: FacetKind.ENUM;
      readonly key: string;
      readonly label: string;
      /** Values offered as checkboxes, in schema order. */
      readonly options: readonly string[];
    }
  | {
      readonly kind: FacetKind.RANGE;
      readonly key: string;
      readonly label: string;
      /** `minimum` of the schema, used as input hint. */
      readonly minimum?: number;
      /** `maximum` of the schema, used as input hint. */
      readonly maximum?: number;
    }
  | { readonly kind: FacetKind.BOOLEAN; readonly key: string; readonly label: string };

/** What the front derives from a category JSON Schema. */
export interface ParsedCategorySchema {
  /** Filters, in schema order. */
  readonly facets: readonly CategoryFacet[];
  /** Label of every property (filtered or not), for the technical sheet. */
  readonly labels: Readonly<Record<string, string>>;
}

/** Splits camelCase and snake_case words: `displayType` → `display Type`. */
const WORD_BOUNDARY = /(?<=[a-z0-9])(?=[A-Z])|_+/g;

/**
 * Turns a property key into a readable label when the schema has no `title`.
 *
 * @param key - Property key, e.g. `refreshRate`.
 * @returns The humanised key, e.g. `Refresh rate`.
 */
export function humanizeKey(key: string): string {
  const words = key.replace(WORD_BOUNDARY, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Builds the facet of one property, if the front knows how to filter it.
 *
 * @param key - Property key.
 * @param property - Property definition.
 * @returns The facet, or `null` for a free-text string or an unknown type.
 */
function toFacet(key: string, property: JsonSchemaProperty): CategoryFacet | null {
  const label = property.title ?? humanizeKey(key);
  switch (property.type) {
    case JsonSchemaType.STRING:
      // A free-text string becomes a TEXT facet whose values come from the catalog facets
      // (specs/002-catalog-refresh research R3); an enum keeps its schema options.
      return property.enum && property.enum.length > 0
        ? { kind: FacetKind.ENUM, key, label, options: property.enum.map(String) }
        : { kind: FacetKind.TEXT, key, label };
    case JsonSchemaType.NUMBER:
    case JsonSchemaType.INTEGER:
      return {
        kind: FacetKind.RANGE,
        key,
        label,
        ...(property.minimum === undefined ? {} : { minimum: property.minimum }),
        ...(property.maximum === undefined ? {} : { maximum: property.maximum }),
      };
    case JsonSchemaType.BOOLEAN:
      return { kind: FacetKind.BOOLEAN, key, label };
    case undefined:
      return null;
    default:
      return assertNever(property.type);
  }
}

/**
 * Reads a JSON string without throwing.
 *
 * @param text - Raw JSON.
 * @returns The parsed value, or `undefined` when the text is not JSON.
 */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Parses a category JSON Schema into facets and labels.
 *
 * @param jsonSchema - `jsonSchema` string of the backend response.
 * @returns The facets and labels, or `null` when the string is not an object JSON Schema.
 */
export function parseCategorySchema(jsonSchema: string): ParsedCategorySchema | null {
  const root = JsonSchemaRootSchema.safeParse(parseJson(jsonSchema));
  if (!root.success) {
    return null;
  }
  const facets: CategoryFacet[] = [];
  const labels: Record<string, string> = {};
  for (const [key, property] of Object.entries(root.data.properties)) {
    labels[key] = property.title ?? humanizeKey(key);
    const facet = toFacet(key, property);
    if (facet) {
      facets.push(facet);
    }
  }
  return { facets, labels };
}

/**
 * Returns the filters of a category.
 *
 * @param jsonSchema - `jsonSchema` string of the backend response.
 * @returns The facets, empty when the schema cannot be read.
 */
export function parseCategoryFacets(jsonSchema: string): readonly CategoryFacet[] {
  return parseCategorySchema(jsonSchema)?.facets ?? [];
}
