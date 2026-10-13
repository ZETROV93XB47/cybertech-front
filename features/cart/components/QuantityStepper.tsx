"use client";

/**
 * Quantity selector (1–99) in dark neumorphism: « − », the value, « + ».
 *
 * The value field stays a real `<input type="number">` so it can be typed and is announced as a
 * spin button; the border takes the success colour while focused or when `active` is set.
 */
import { Minus, Plus } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";

import { CART_LINE_MAX_QUANTITY, CART_LINE_MIN_QUANTITY } from "@/lib/constants/cart";
import { cn } from "@/lib/utils";

import { CART_MESSAGES } from "../messages";

/** Props of {@link QuantityStepper}. */
export interface QuantityStepperProps {
  readonly value: number;
  readonly onChange: (quantity: number) => void;
  /** Accessible name of the field. */
  readonly label: string;
  readonly disabled?: boolean;
  /** Highlights the border (e.g. the product is already in the cart). */
  readonly active?: boolean;
  /** Upper bound, never above {@link CART_LINE_MAX_QUANTITY}. */
  readonly max?: number;
  readonly className?: string;
}

/** Shared style of the « − » and « + » buttons. */
const STEP_BUTTON =
  "inline-flex size-9 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-text disabled:pointer-events-none disabled:opacity-40";

/**
 * Bounds a typed quantity.
 *
 * @param value - Typed value.
 * @param max - Upper bound.
 * @returns An integer between the minimum quantity and `max`.
 */
function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return CART_LINE_MIN_QUANTITY;
  }
  return Math.min(max, Math.max(CART_LINE_MIN_QUANTITY, Math.trunc(value)));
}

/**
 * Quantity stepper.
 *
 * @param props - Value, change handler, label and state.
 * @returns The stepper.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  disabled = false,
  active = false,
  max = CART_LINE_MAX_QUANTITY,
  className,
}: QuantityStepperProps): ReactNode {
  const bound = Math.min(max, CART_LINE_MAX_QUANTITY);
  const onInput = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(clampQuantity(event.target.valueAsNumber, bound));
  };
  return (
    <div
      data-active={active}
      className={cn("neumorphic inline-flex items-center gap-1 rounded-button p-1", className)}
    >
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={CART_MESSAGES.decreaseQuantity}
        disabled={disabled || value <= CART_LINE_MIN_QUANTITY}
        onClick={() => {
          onChange(clampQuantity(value - 1, bound));
        }}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={CART_LINE_MIN_QUANTITY}
        max={bound}
        value={value}
        disabled={disabled}
        onChange={onInput}
        className="neumorphic-inset h-9 w-12 rounded-field text-center font-mono text-sm text-text quantity-input"
      />
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={CART_MESSAGES.increaseQuantity}
        disabled={disabled || value >= bound}
        onClick={() => {
          onChange(clampQuantity(value + 1, bound));
        }}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
