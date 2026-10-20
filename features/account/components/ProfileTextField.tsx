"use client";

/**
 * Accessible field of the profile form: a visible label, an optional hint and the error written
 * under the field, both linked with `aria-describedby`, `aria-invalid` while it is wrong
 * (WCAG 3.3.1). Uncontrolled (`defaultValue`), so the form also works without JavaScript.
 */
import type { FocusEvent, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import type { ProfileField } from "@/lib/enums/profile";
import { cn } from "@/lib/utils";

/** Prefix of the field ids, so they never collide with other forms of the page. */
const ID_PREFIX = "profile-";

/** Suffix of the id of a field's error message. */
const ERROR_ID_SUFFIX = "-error";

/** Suffix of the id of a field's hint. */
const HINT_ID_SUFFIX = "-hint";

/** Props of {@link ProfileTextField}. */
export interface ProfileTextFieldProps {
  readonly name: ProfileField;
  readonly label: string;
  readonly error: string | undefined;
  readonly defaultValue: string | undefined;
  readonly autoComplete: string;
  readonly type?: "text" | "tel";
  readonly hint?: string;
  readonly className?: string;
  /** Called when the field loses the focus, with its form (to validate it). */
  readonly onBlur: (form: HTMLFormElement | null, field: ProfileField) => void;
}

/**
 * Builds the `aria-describedby` of a field.
 *
 * @param id - Field id.
 * @param hasHint - Whether a hint is shown.
 * @param hasError - Whether an error is shown.
 * @returns The ids, or `undefined`.
 */
function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${id}${HINT_ID_SUFFIX}` : "", hasError ? `${id}${ERROR_ID_SUFFIX}` : ""];
  const joined = ids.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

/**
 * Labelled text input with its hint and error.
 *
 * @param props - Field definition and state.
 * @returns The field.
 */
export function ProfileTextField(props: ProfileTextFieldProps): ReactNode {
  const { name, label, error, defaultValue, autoComplete, type = "text", hint, onBlur } = props;
  const id = `${ID_PREFIX}${name}`;
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          onBlur(event.currentTarget.form, name);
        }}
      />
      {hint && (
        <p id={`${id}${HINT_ID_SUFFIX}`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}${ERROR_ID_SUFFIX}`} className="text-sm text-rose">
          {error}
        </p>
      )}
    </div>
  );
}
