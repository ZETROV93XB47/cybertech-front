"use client";

/**
 * Accessible fields of the registration form: a visible label, the error written under the field
 * and linked with `aria-describedby`, `aria-invalid` while it is wrong (FR-011, WCAG 3.3.1).
 */
import { Select } from "radix-ui";
import { useRef, useState, type FocusEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { DropPanel, PanelOrigin } from "@/components/effects/DropPanel";
import { Input } from "@/components/ui/input";
import { LISTBOX_OFFSET_PX, ListboxChevron, ListboxItem } from "@/components/ui/listbox";
import { RegisterField } from "@/lib/enums/register-field";
import { cn } from "@/lib/utils";

/** Suffix of the id of a field's error message. */
const ERROR_ID_SUFFIX = "-error";

/** Suffix of the id of a field's hint. */
const HINT_ID_SUFFIX = "-hint";

/** Suffix of the id of the native select shown without JavaScript. */
const NATIVE_ID_SUFFIX = "-native";

/** Selector of an open Radix list, to tell a focus move into it from leaving the field. */
const LISTBOX_SELECTOR = "[role=listbox]";

/** Style of a list trigger: the shadcn input look, with the brand border on hover and focus. */
const TRIGGER_CLASS =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm text-text transition-colors duration-(--duration-fast) outline-none hover:border-brand-text focus-visible:border-brand-text data-placeholder:text-text-muted aria-invalid:border-destructive noscript:hidden";

/** Style of the native `<select>` shown without JavaScript, aligned with the shadcn input. */
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-text aria-invalid:border-destructive";

/** Props shared by every field. */
interface BaseFieldProps {
  readonly name: RegisterField;
  readonly label: string;
  readonly error: string | undefined;
  readonly defaultValue?: string | undefined;
  /** Called when the field loses the focus, with its form (to validate it). */
  readonly onBlur: (form: HTMLFormElement | null, field: RegisterField) => void;
}

/**
 * Builds the `aria-describedby` of a field.
 *
 * @param name - Field name.
 * @param hasError - Whether an error is shown.
 * @param hasHint - Whether a hint is shown.
 * @returns The ids, or `undefined`.
 */
function describedBy(name: string, hasError: boolean, hasHint: boolean): string | undefined {
  const ids = [
    hasHint ? `${name}${HINT_ID_SUFFIX}` : "",
    hasError ? `${name}${ERROR_ID_SUFFIX}` : "",
  ];
  const joined = ids.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

/**
 * Error line of a field.
 *
 * @param props - Field name and message.
 * @returns The message, or nothing.
 */
function FieldError({
  name,
  error,
}: {
  readonly name: string;
  readonly error: string | undefined;
}): ReactNode {
  if (!error) {
    return null;
  }
  return (
    <p id={`${name}${ERROR_ID_SUFFIX}`} className="text-sm text-rose">
      {error}
    </p>
  );
}

/** Props of {@link TextField}. */
export interface TextFieldProps extends BaseFieldProps {
  readonly type?: "text" | "email" | "tel" | "date" | "password";
  readonly autoComplete: string;
  readonly hint?: string;
  readonly className?: string;
}

/**
 * Labelled text input with its error.
 *
 * @param props - Field definition and state.
 * @returns The field.
 */
export function TextField(props: TextFieldProps): ReactNode {
  const { name, label, error, defaultValue, onBlur, type = "text", autoComplete, hint } = props;
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, Boolean(error), Boolean(hint))}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          onBlur(event.currentTarget.form, name);
        }}
      />
      {hint && (
        <p id={`${name}${HINT_ID_SUFFIX}`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      <FieldError name={name} error={error} />
    </div>
  );
}

/** One option of a choice field. */
export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
}

/** Props of {@link RadioField}. */
export interface RadioFieldProps extends BaseFieldProps {
  readonly options: readonly ChoiceOption[];
}

/**
 * Radio group in a `fieldset` whose `legend` is the label.
 *
 * @param props - Field definition, options and state.
 * @returns The group.
 */
export function RadioField({
  name,
  label,
  error,
  defaultValue,
  onBlur,
  options,
}: RadioFieldProps): ReactNode {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, Boolean(error), false)}
    >
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex gap-6">
        {options.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              onBlur={(event) => {
                onBlur(event.currentTarget.form, name);
              }}
              className="size-4 accent-brand"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError name={name} error={error} />
    </fieldset>
  );
}

/** Props of {@link SelectField}. */
export interface SelectFieldProps extends BaseFieldProps {
  readonly options: readonly ChoiceOption[];
  /** Text shown while nothing is chosen. */
  readonly placeholder: string;
}

/**
 * Native select shown only without JavaScript, with its own label.
 *
 * Rendered before the hidden input of the custom list so that `FormData.get` reads it first.
 *
 * @param props - Field definition and options.
 * @returns The `noscript` block.
 */
function NoScriptSelect(props: SelectFieldProps): ReactNode {
  const { name, label, defaultValue, options, placeholder } = props;
  const nativeId = `${name}${NATIVE_ID_SUFFIX}`;
  return (
    <noscript>
      <label htmlFor={nativeId} className="text-sm font-medium">
        {label}
      </label>
      <select id={nativeId} name={name} defaultValue={defaultValue ?? ""} className={SELECT_CLASS}>
        <option value="">{placeholder}</option>
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
 * Labelled dropdown list with its error, opening like the catalog « Trier par » list.
 *
 * Built on the Radix `Select` (listbox pattern: arrows, Enter, Escape, typeahead). The value is
 * submitted through a hidden input rather than the Radix native select, because a hidden input
 * keeps its value when React resets the form after the server action. The field is validated
 * when the list closes, or when the focus leaves the trigger for something else than the list.
 *
 * @param props - Field definition, options and state.
 * @returns The field, with its no-JavaScript select.
 * @see features/catalog/components/SortSelect.tsx
 */
export function SelectField(props: SelectFieldProps): ReactNode {
  const { name, label, error, defaultValue, onBlur, options, placeholder } = props;
  const [value, setValue] = useState(defaultValue ?? "");
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const validate = (): void => {
    onBlur(triggerRef.current?.form ?? null, name);
  };
  const onValueChange = (next: string): void => {
    // Written to the hidden input before the list closes, so that the validation reads it.
    flushSync(() => {
      setValue(next);
    });
  };
  const onOpenChange = (open: boolean): void => {
    setOpen(open);
    if (!open) {
      validate();
    }
  };
  const onTriggerBlur = (event: FocusEvent<HTMLButtonElement>): void => {
    const target = event.relatedTarget;
    if (!isOpen && !(target instanceof Element && target.closest(LISTBOX_SELECTOR))) {
      validate();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium noscript:hidden">
        {label}
      </label>
      <NoScriptSelect {...props} />
      <input type="hidden" name={name} value={value} />
      <Select.Root
        value={value}
        onValueChange={onValueChange}
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <Select.Trigger
          ref={triggerRef}
          id={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, Boolean(error), false)}
          onBlur={onTriggerBlur}
          className={TRIGGER_CLASS}
        >
          <Select.Value placeholder={placeholder} />
          <ListboxChevron isOpen={isOpen} />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            align="start"
            sideOffset={LISTBOX_OFFSET_PX}
            className="z-50"
          >
            <DropPanel origin={PanelOrigin.TOP_LEFT} className="w-(--radix-select-trigger-width)">
              <Select.Viewport>
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
      </Select.Root>
      <FieldError name={name} error={error} />
    </div>
  );
}
