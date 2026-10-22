"use client";

/**
 * Accessible fields of the registration form: a visible label, the error written under the field
 * and linked with `aria-describedby`, `aria-invalid` while it is wrong (FR-011, WCAG 3.3.1).
 */
import type { FocusEvent, ReactNode } from "react";

import { ListboxSelect } from "@/components/dropdown/ListboxSelect";
import { Input } from "@/components/ui/input";
import { RegisterField } from "@/lib/enums/register-field";
import { cn } from "@/lib/utils";

/** Suffix of the id of a field's error message. */
const ERROR_ID_SUFFIX = "-error";

/** Suffix of the id of a field's hint. */
const HINT_ID_SUFFIX = "-hint";

/** Style of a list trigger: the shadcn input look of this form, brand border on hover and focus. */
const TRIGGER_CLASS =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm text-text transition-colors duration-(--duration-fast) outline-none hover:border-brand-text focus-visible:border-brand-text data-placeholder:text-text-muted aria-invalid:border-destructive noscript:hidden";

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
 * Labelled dropdown list with its error, following the site dropdown rule (looks and opens like
 * the « Catalogue » menu). Validated when the list closes or the focus leaves it.
 *
 * @param props - Field definition, options and state.
 * @returns The field.
 * @see components/dropdown/ListboxSelect.tsx
 */
export function SelectField(props: SelectFieldProps): ReactNode {
  const { name, label, error, defaultValue, onBlur, options, placeholder } = props;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <ListboxSelect
        id={name}
        name={name}
        label={label}
        options={options}
        placeholder={placeholder}
        defaultValue={defaultValue}
        isInvalid={Boolean(error)}
        describedBy={describedBy(name, Boolean(error), false)}
        onDismiss={(form) => {
          onBlur(form, name);
        }}
        triggerClassName={TRIGGER_CLASS}
      />
      <FieldError name={name} error={error} />
    </div>
  );
}
