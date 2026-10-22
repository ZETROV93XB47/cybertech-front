"use client";

/**
 * Form field choosing one value in a dropdown list that looks and opens like the « Catalogue »
 * menu (site dropdown rule), in place of a native `<select>`, whose list the browser draws.
 *
 * Built on the Radix `Select` (listbox pattern: arrows, Enter, Escape, typeahead). Controlled
 * (`value` + `onValueChange`) or not (`defaultValue`). With a `name`, the value is posted through
 * a hidden input rather than the Radix native select, because a hidden input keeps its value when
 * React resets the form after a server action; a native select inside `<noscript>`, rendered
 * first so that `FormData.get` reads it, keeps the form working without JavaScript.
 * `onDismiss` runs when the list closes or the focus leaves the trigger for something else than
 * the list, so that a form can validate the field at that moment.
 *
 * @see components/dropdown/listbox.tsx
 * @see features/catalog/components/SortSelect.tsx
 */
import { Select } from "radix-ui";
import { useRef, useState, type FocusEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { DropPanel, PanelOrigin } from "@/components/effects/DropPanel";

import { LISTBOX_OFFSET_PX, ListboxChevron, ListboxItem } from "./listbox";

/** Selector of an open Radix list, to tell a focus move into it from leaving the field. */
const LISTBOX_SELECTOR = "[role=listbox]";

/**
 * Default style of the trigger: the field look of the site forms (border, surface, brand border
 * on hover and focus), the placeholder muted.
 */
export const LISTBOX_FIELD_TRIGGER_CLASS =
  "flex h-10 w-full items-center justify-between gap-2 rounded-field border border-border bg-surface px-3 text-left text-sm text-text transition-colors duration-(--duration-fast) outline-none hover:border-brand-text focus-visible:border-brand-text data-placeholder:text-text-muted aria-invalid:border-rose noscript:hidden";

/** Style of the native select shown without JavaScript. */
const NATIVE_SELECT_CLASS =
  "h-10 w-full rounded-field border border-border bg-surface px-3 text-sm text-text";

/** One choice of the list. */
export interface ListboxOption {
  readonly value: string;
  readonly label: string;
}

/** Props of {@link ListboxSelect}. */
export interface ListboxSelectProps {
  /** Id of the trigger, target of the field label (`<label htmlFor>`). */
  readonly id: string;
  /** Accessible name of the native select shown without JavaScript (the visible label). */
  readonly label: string;
  readonly options: readonly ListboxOption[];
  /** Text shown while nothing is chosen; also the empty option without JavaScript. */
  readonly placeholder?: string | undefined;
  /** Form field name; without it nothing is posted (field driven by `onValueChange`). */
  readonly name?: string | undefined;
  /** Controlled value (with `onValueChange`). */
  readonly value?: string | undefined;
  /** Initial value when not controlled. */
  readonly defaultValue?: string | undefined;
  readonly onValueChange?: ((value: string) => void) | undefined;
  readonly isInvalid?: boolean | undefined;
  /** Ids of the hint and error texts (`aria-describedby`). */
  readonly describedBy?: string | undefined;
  /** Called when the list closes or the focus leaves the field, with its form. */
  readonly onDismiss?: ((form: HTMLFormElement | null) => void) | undefined;
  /** Trigger style; the site field look by default. */
  readonly triggerClassName?: string | undefined;
}

/**
 * Value of the field, controlled or not. A choice is written synchronously so that the hidden
 * input already holds it when the list closes and `onDismiss` validates the form.
 *
 * @param props - Value props of the field.
 * @returns The current value and the change handler.
 */
function useListboxValue(
  props: Pick<ListboxSelectProps, "value" | "defaultValue" | "onValueChange">,
): readonly [string, (next: string) => void] {
  const [own, setOwn] = useState(props.defaultValue ?? "");
  const value = props.value ?? own;
  const onChange = (next: string): void => {
    flushSync(() => {
      setOwn(next);
      props.onValueChange?.(next);
    });
  };
  return [value, onChange];
}

/**
 * Native select shown only without JavaScript.
 *
 * @param props - Field props.
 * @returns The `noscript` block, or nothing for a field that posts nothing.
 */
function NoScriptSelect(props: ListboxSelectProps): ReactNode {
  const { name, label, options, placeholder, value, defaultValue } = props;
  if (name === undefined) {
    return null;
  }
  return (
    <noscript>
      <select
        name={name}
        aria-label={label}
        defaultValue={value ?? defaultValue ?? ""}
        className={NATIVE_SELECT_CLASS}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </noscript>
  );
}

/**
 * List of the field, in the shared dropdown panel, as wide as the trigger.
 *
 * @param props - Options and current value.
 * @returns The Radix portal with the list.
 */
function ListboxPanel({
  options,
  value,
}: {
  readonly options: readonly ListboxOption[];
  readonly value: string;
}): ReactNode {
  return (
    <Select.Portal>
      <Select.Content
        position="popper"
        align="start"
        sideOffset={LISTBOX_OFFSET_PX}
        className="z-50"
      >
        {/* Long lists (years) scroll inside the panel, which never leaves the window. */}
        <DropPanel
          origin={PanelOrigin.TOP_LEFT}
          className="flex max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) flex-col"
        >
          <Select.Viewport className="min-h-0">
            {options.map((option) => (
              <ListboxItem
                key={option.value}
                value={option.value}
                label={option.label}
                isCurrent={option.value === value}
              />
            ))}
          </Select.Viewport>
        </DropPanel>
      </Select.Content>
    </Select.Portal>
  );
}

/**
 * Dropdown list field.
 *
 * @param props - Field definition, value and handlers.
 * @returns The no-JavaScript select, the hidden input and the list.
 */
export function ListboxSelect(props: ListboxSelectProps): ReactNode {
  const { id, name, options, placeholder, isInvalid, describedBy, onDismiss } = props;
  const [value, setValue] = useListboxValue(props);
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dismiss = (): void => {
    onDismiss?.(triggerRef.current?.form ?? null);
  };
  const onOpenChange = (open: boolean): void => {
    setOpen(open);
    if (!open) {
      dismiss();
    }
  };
  const onTriggerBlur = (event: FocusEvent<HTMLButtonElement>): void => {
    const target = event.relatedTarget;
    if (!isOpen && !(target instanceof Element && target.closest(LISTBOX_SELECTOR))) {
      dismiss();
    }
  };
  return (
    <>
      <NoScriptSelect {...props} />
      {name !== undefined && <input type="hidden" name={name} value={value} />}
      <Select.Root value={value} onValueChange={setValue} open={isOpen} onOpenChange={onOpenChange}>
        <Select.Trigger
          ref={triggerRef}
          id={id}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={describedBy}
          onBlur={onTriggerBlur}
          className={props.triggerClassName ?? LISTBOX_FIELD_TRIGGER_CLASS}
        >
          <Select.Value placeholder={placeholder} />
          <ListboxChevron isOpen={isOpen} />
        </Select.Trigger>
        <ListboxPanel options={options} value={value} />
      </Select.Root>
    </>
  );
}
