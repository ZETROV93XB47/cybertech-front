"use client";

/**
 * Lines of the order edit form: quantity stepper, removal (impossible on the last line, with
 * the way to cancel the order instead), « Ajouté » tag and catalog price for added lines, and
 * the stock flag after a refused save.
 *
 * @see specs/003-account-orders/spec.md US3 scenarios 9 and 10, FR-025
 */
import { Trash2 } from "lucide-react";
import Link from "next/link";
import type { Dispatch, ReactNode } from "react";

import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { orderPath } from "@/lib/constants/routes";
import { OrderEditActionType } from "@/lib/enums/order";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ORDER_EDIT_MESSAGES } from "../messages";
import type { EditLine, OrderEditAction, StockFlag } from "../order-edit";

/** Props of {@link EditLines}. */
export interface EditLinesProps {
  readonly orderUuid: string;
  readonly lines: readonly EditLine[];
  readonly stockFlagged: readonly StockFlag[];
  readonly dispatch: Dispatch<OrderEditAction>;
  readonly disabled: boolean;
}

/**
 * Stock message of a flagged line: the remaining quantity when the backend named the line.
 *
 * @param flag - Flag of the line.
 * @returns The message.
 */
function stockMessage(flag: StockFlag): string {
  return flag.available === null
    ? ORDER_EDIT_MESSAGES.stockIssue
    : ORDER_EDIT_MESSAGES.stockLeft(flag.available);
}

/**
 * One edited line.
 *
 * @param props - Line, flags and dispatcher.
 * @returns The list item.
 */
function EditLineRow({
  line,
  isLast,
  flag,
  dispatch,
  disabled,
}: {
  readonly line: EditLine;
  readonly isLast: boolean;
  /** Stock flag of the line after a refused save, if any. */
  readonly flag: StockFlag | undefined;
  readonly dispatch: Dispatch<OrderEditAction>;
  readonly disabled: boolean;
}): ReactNode {
  return (
    <li
      data-flagged={flag !== undefined}
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-card border border-border p-4",
        flag !== undefined && "border-rose",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm">{line.productName}</span>
        {line.originalQuantity === 0 && (
          <span className="text-xs text-brand-text">
            {ORDER_EDIT_MESSAGES.addedLine}
            {line.unitPrice !== null && ` · ${formatPrice(line.unitPrice)}`}
          </span>
        )}
        {flag !== undefined && <span className="text-xs text-rose">{stockMessage(flag)}</span>}
      </span>
      <QuantityStepper
        value={line.quantity}
        label={ORDER_EDIT_MESSAGES.quantityLabel(line.productName)}
        disabled={disabled}
        onChange={(quantity) => {
          dispatch({
            type: OrderEditActionType.SET_QUANTITY,
            productUuid: line.productUuid,
            quantity,
          });
        }}
      />
      <button
        type="button"
        disabled={disabled || isLast}
        aria-label={ORDER_EDIT_MESSAGES.remove(line.productName)}
        className="inline-flex size-9 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-rose disabled:opacity-40"
        onClick={() => {
          dispatch({ type: OrderEditActionType.REMOVE_LINE, productUuid: line.productUuid });
        }}
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    </li>
  );
}

/**
 * Edited lines.
 *
 * @param props - Lines, flags, dispatcher and disabled state.
 * @returns The lines and the last-line explanation.
 */
export function EditLines({
  orderUuid,
  lines,
  stockFlagged,
  dispatch,
  disabled,
}: EditLinesProps): ReactNode {
  const isSingle = lines.length === 1;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <EditLineRow
            key={line.productUuid}
            line={line}
            isLast={isSingle}
            flag={stockFlagged.find((candidate) => candidate.productUuid === line.productUuid)}
            dispatch={dispatch}
            disabled={disabled}
          />
        ))}
      </ul>
      {isSingle && (
        <p className="text-sm text-text-muted">
          {ORDER_EDIT_MESSAGES.lastLine}{" "}
          <Link
            href={orderPath(orderUuid)}
            className="text-brand-text underline underline-offset-4"
          >
            {ORDER_EDIT_MESSAGES.cancelInstead}
          </Link>
        </p>
      )}
    </div>
  );
}
