/**
 * Label, hint and error around one control of the card forms, linked with
 * `aria-describedby` (WCAG 3.3.1); the control itself is passed as a render function receiving
 * the ids to wire.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Suffix of the id of a field's error message. */
const ERROR_ID_SUFFIX = "-error";

/** Suffix of the id of a field's hint. */
const HINT_ID_SUFFIX = "-hint";

/** Attributes the control must carry. */
export interface CardControlProps {
  readonly id: string;
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": boolean | undefined;
}

/**
 * Builds the `aria-describedby` of a control.
 *
 * @param id - Control id.
 * @param hasHint - Whether a hint is shown.
 * @param hasError - Whether an error is shown.
 * @returns The ids, or `undefined`.
 */
export function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${id}${HINT_ID_SUFFIX}` : "", hasError ? `${id}${ERROR_ID_SUFFIX}` : ""];
  const joined = ids.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

/** Props of {@link CardFieldShell}. */
export interface CardFieldShellProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error: string | undefined;
  readonly className?: string;
  readonly children: (control: CardControlProps) => ReactNode;
}

/**
 * Field shell.
 *
 * @param props - Id, label, hint, error and the control.
 * @returns The labelled field.
 */
export function CardFieldShell(props: CardFieldShellProps): ReactNode {
  const { id, label, hint, error, children } = props;
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy(id, hint !== undefined, error !== undefined),
        "aria-invalid": error === undefined ? undefined : true,
      })}
      {hint !== undefined && (
        <p id={`${id}${HINT_ID_SUFFIX}`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${id}${ERROR_ID_SUFFIX}`} className="text-sm text-rose">
          {error}
        </p>
      )}
    </div>
  );
}
