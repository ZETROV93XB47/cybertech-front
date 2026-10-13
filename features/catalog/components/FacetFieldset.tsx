/**
 * One category-specific filter, generated from the category JSON Schema (FR-003).
 *
 * Field names follow the URL format parsed by `search-params.ts`: `a.<key>` for values and
 * `r.<key>.min` / `r.<key>.max` for ranges, so the form also works without JavaScript.
 */
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { FacetKind } from "@/lib/enums/facet-kind";
import { RangeBound, SearchParamPrefix } from "@/lib/enums/search-param";
import type { CategoryFacet } from "@/lib/schemas/category";
import type { SearchFilters } from "@/lib/schemas/search";

import { ATTRIBUTE_LABELS, ATTRIBUTE_UNITS, LIST_MESSAGES } from "../messages";

/** Value sent for a checked boolean attribute; the backend matches it as text. */
const BOOLEAN_FILTER_VALUE = "true";

/** Style of a filter group. */
export const FIELDSET = "flex flex-col gap-2";

/** Style of a filter group title. */
export const LEGEND = "mb-1 text-sm font-medium text-text";

/** Style of the text and number inputs of the filters. */
export const INPUT =
  "h-10 w-full rounded-field border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-muted";

/**
 * Label of an attribute in French, with its unit when known.
 *
 * @param key - Attribute key.
 * @param fallback - Label read from the schema (`title` or humanised key).
 * @returns The label, e.g. « Mémoire vive (Go) ».
 */
export function attributeLabel(key: string, fallback: string): string {
  const label = ATTRIBUTE_LABELS[key] ?? fallback;
  const unit = ATTRIBUTE_UNITS[key];
  return unit ? `${label} (${unit})` : label;
}

/** Props of {@link FacetFieldset}. */
export interface FacetFieldsetProps {
  readonly facet: CategoryFacet;
  readonly filters: SearchFilters;
}

/**
 * Minimum and maximum inputs of a numeric attribute.
 *
 * @param props - Facet key, label, bounds and current range.
 * @returns The two inputs.
 */
function RangeInputs({
  name,
  label,
  minimum,
  maximum,
  filters,
}: {
  readonly name: string;
  readonly label: string;
  readonly minimum: number | undefined;
  readonly maximum: number | undefined;
  readonly filters: SearchFilters;
}): ReactNode {
  const range = filters.numericRanges[name];
  const field = `${SearchParamPrefix.RANGE}${name}.`;
  return (
    <div className="flex items-center gap-2">
      {[RangeBound.MIN, RangeBound.MAX].map((bound) => (
        <input
          key={bound}
          type="number"
          name={`${field}${bound}`}
          aria-label={
            bound === RangeBound.MIN
              ? LIST_MESSAGES.rangeMinLabel(label)
              : LIST_MESSAGES.rangeMaxLabel(label)
          }
          placeholder={
            bound === RangeBound.MIN ? LIST_MESSAGES.rangeShortMin : LIST_MESSAGES.rangeShortMax
          }
          min={minimum}
          max={maximum}
          defaultValue={range?.[bound]}
          className={INPUT}
        />
      ))}
    </div>
  );
}

/**
 * Checkboxes of an attribute: one per enum value, or a single « Oui » for a boolean.
 *
 * @param props - Field name, values and selected values.
 * @returns The checkboxes.
 */
function ValueCheckboxes({
  name,
  options,
  selected,
}: {
  readonly name: string;
  readonly options: readonly (readonly [string, string])[];
  readonly selected: readonly string[];
}): ReactNode {
  return options.map(([value, text]) => (
    <label key={value} className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={`${SearchParamPrefix.ATTRIBUTE}${name}`}
        value={value}
        defaultChecked={selected.includes(value)}
        className="accent-brand"
      />
      {text}
    </label>
  ));
}

/**
 * Renders the inputs matching the facet kind.
 *
 * @param props - Facet and current filters.
 * @returns The inputs.
 */
function FacetInputs({ facet, filters }: FacetFieldsetProps): ReactNode {
  const selected = filters.attributes[facet.key] ?? [];
  const label = attributeLabel(facet.key, facet.label);
  switch (facet.kind) {
    case FacetKind.ENUM:
      return (
        <ValueCheckboxes
          name={facet.key}
          options={facet.options.map((option) => [option, option] as const)}
          selected={selected}
        />
      );
    case FacetKind.BOOLEAN:
      return (
        <ValueCheckboxes
          name={facet.key}
          options={[[BOOLEAN_FILTER_VALUE, LIST_MESSAGES.booleanYes]]}
          selected={selected}
        />
      );
    case FacetKind.RANGE:
      return (
        <RangeInputs
          name={facet.key}
          label={label}
          minimum={facet.minimum}
          maximum={facet.maximum}
          filters={filters}
        />
      );
    default:
      return assertNever(facet);
  }
}

/**
 * A category attribute filter.
 *
 * @param props - Facet and current filters.
 * @returns The fieldset with its legend.
 */
export function FacetFieldset({ facet, filters }: FacetFieldsetProps): ReactNode {
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>{attributeLabel(facet.key, facet.label)}</legend>
      <FacetInputs facet={facet} filters={filters} />
    </fieldset>
  );
}
