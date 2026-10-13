/**
 * One category attribute filter, built by `buildFilterFacets` (FR-001 to FR-008).
 *
 * Field names follow the URL format parsed by `search-params.ts`: `a.<key>` for values and
 * `r.<key>.min` / `r.<key>.max` for ranges, so the form also works without JavaScript. Long
 * value lists fold into a native `<details>` « Voir tout », usable without JavaScript too.
 *
 * @see specs/002-catalog-refresh/research.md R4, R5, R7
 */
import type { ReactNode, SyntheticEvent } from "react";

import { assertNever } from "@/lib/assert-never";
import { FacetKind } from "@/lib/enums/facet-kind";
import { RangeBound, SearchParamPrefix } from "@/lib/enums/search-param";
import { UI_LOCALE } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  BOOLEAN_FILTER_VALUE,
  type FilterFacet,
  type FilterValue,
  type RangeFilterFacet,
  type ValuesFilterFacet,
} from "../filter-facets";
import { LIST_MESSAGES } from "../messages";

/** Style of a filter group. */
export const FIELDSET = "flex flex-col gap-2";

/** Style of a filter group title. */
export const LEGEND = "mb-1 text-sm font-medium text-text";

/** Style of the text and number inputs of the filters. */
export const INPUT =
  "h-10 w-full rounded-field border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-muted";

/**
 * Title of a filter, with its unit when known (« Mémoire vive (Go) »).
 *
 * @param facet - The filter.
 * @returns The legend text.
 */
export function facetLegend(facet: Pick<FilterFacet, "label" | "unit">): string {
  return facet.unit ? `${facet.label} (${facet.unit})` : facet.label;
}

/** Props of {@link ValueCheckbox}. */
interface ValueCheckboxProps {
  /** Form field name (`a.<key>` or `brand`). */
  readonly name: string;
  readonly item: FilterValue;
}

/**
 * One value checkbox with its count; greyed out and not tickable when the count is 0 (FR-004).
 *
 * @param props - Field name and value.
 * @returns The labelled checkbox.
 */
export function ValueCheckbox({ name, item }: ValueCheckboxProps): ReactNode {
  return (
    <label className={cn("flex items-center gap-2 text-sm", item.isDisabled && "text-text-muted")}>
      <input
        type="checkbox"
        name={name}
        value={item.value}
        defaultChecked={item.isChecked}
        disabled={item.isDisabled}
        className="accent-brand"
      />
      <span className="min-w-0 flex-1 truncate" title={item.label}>
        {item.label}
      </span>
      {item.count !== null && (
        <>
          {/* Keeps « value (12) » as two words for screen readers. */}{" "}
          <span className="text-xs text-text-muted">{LIST_MESSAGES.valueCount(item.count)}</span>
        </>
      )}
    </label>
  );
}

/**
 * Checkboxes of a text or enum attribute, the extra ones folded under « Voir tout ».
 *
 * @param props - The filter.
 * @returns The visible checkboxes and the disclosure.
 */
function ValueList({ facet }: { readonly facet: ValuesFilterFacet }): ReactNode {
  const name = `${SearchParamPrefix.ATTRIBUTE}${facet.key}`;
  const visible = facet.values.slice(0, facet.visibleCount);
  const hidden = facet.values.slice(facet.visibleCount);
  return (
    <>
      {visible.map((item) => (
        <ValueCheckbox key={item.value} name={name} item={item} />
      ))}
      {hidden.length > 0 && (
        <details open={facet.isExpanded} className="group flex flex-col gap-2">
          <summary className="cursor-pointer text-sm text-brand-text">
            <span className="group-open:hidden">
              {LIST_MESSAGES.showAllValues(facet.values.length)}
            </span>
            <span className="hidden group-open:inline">{LIST_MESSAGES.showFewerValues}</span>
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {hidden.map((item) => (
              <ValueCheckbox key={item.value} name={name} item={item} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

/**
 * Formats a bound with the unit of the filter.
 *
 * @param value - Bound.
 * @param unit - Unit, if any.
 * @returns The text (« 64 Go »).
 */
function formatBound(value: number, unit: string | undefined): string {
  const number = value.toLocaleString(UI_LOCALE);
  return unit ? `${number} ${unit}` : number;
}

/**
 * Minimum and maximum inputs of a numeric attribute, bounded by the observed values; an
 * out-of-range value is refused on the field with a French message (R7).
 *
 * @param props - The filter.
 * @returns The inputs and the bounds hint.
 */
function RangeInputs({ facet }: { readonly facet: RangeFilterFacet }): ReactNode {
  const field = `${SearchParamPrefix.RANGE}${facet.key}.`;
  const hintId = `range-hint-${facet.key}`;
  const legend = facetLegend(facet);
  const { lower, upper } = facet;
  const hasBounds = lower !== undefined && upper !== undefined;
  const outOfBounds = hasBounds
    ? LIST_MESSAGES.rangeOutOfBounds(formatBound(lower, facet.unit), formatBound(upper, facet.unit))
    : "";
  const onInvalid = (event: SyntheticEvent<HTMLInputElement>): void => {
    event.currentTarget.setCustomValidity(outOfBounds);
  };
  const onInput = (event: SyntheticEvent<HTMLInputElement>): void => {
    event.currentTarget.setCustomValidity("");
  };
  return (
    <>
      <div className="flex items-center gap-2">
        {[RangeBound.MIN, RangeBound.MAX].map((bound) => (
          <input
            key={bound}
            type="number"
            name={`${field}${bound}`}
            aria-label={
              bound === RangeBound.MIN
                ? LIST_MESSAGES.rangeMinLabel(legend)
                : LIST_MESSAGES.rangeMaxLabel(legend)
            }
            aria-describedby={hasBounds ? hintId : undefined}
            placeholder={
              bound === RangeBound.MIN ? LIST_MESSAGES.rangeShortMin : LIST_MESSAGES.rangeShortMax
            }
            min={lower}
            max={upper}
            defaultValue={facet.selected?.[bound]}
            onInvalid={hasBounds ? onInvalid : undefined}
            onInput={onInput}
            className={INPUT}
          />
        ))}
      </div>
      {hasBounds && (
        <p id={hintId} className="text-xs text-text-muted">
          {LIST_MESSAGES.rangeBoundsHint(
            formatBound(lower, facet.unit),
            formatBound(upper, facet.unit),
          )}
        </p>
      )}
    </>
  );
}

/**
 * Renders the inputs matching the filter kind.
 *
 * @param props - The filter.
 * @returns The inputs.
 */
function FacetInputs({ facet }: { readonly facet: FilterFacet }): ReactNode {
  switch (facet.kind) {
    case FacetKind.TEXT:
    case FacetKind.ENUM:
      return <ValueList facet={facet} />;
    case FacetKind.BOOLEAN:
      return (
        <ValueCheckbox
          name={`${SearchParamPrefix.ATTRIBUTE}${facet.key}`}
          item={{
            value: BOOLEAN_FILTER_VALUE,
            label: LIST_MESSAGES.booleanYes,
            count: null,
            isChecked: facet.isChecked,
            isDisabled: false,
          }}
        />
      );
    case FacetKind.RANGE:
      return <RangeInputs facet={facet} />;
    default:
      return assertNever(facet);
  }
}

/** Props of {@link FacetFieldset}. */
export interface FacetFieldsetProps {
  readonly facet: FilterFacet;
}

/**
 * A category attribute filter.
 *
 * @param props - The filter.
 * @returns The fieldset with its legend.
 */
export function FacetFieldset({ facet }: FacetFieldsetProps): ReactNode {
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>{facetLegend(facet)}</legend>
      <FacetInputs facet={facet} />
    </fieldset>
  );
}
