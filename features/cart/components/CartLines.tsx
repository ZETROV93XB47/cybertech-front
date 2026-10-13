"use client";

/**
 * Lines of the cart page: photo, name, unit price, quantity stepper, subtotal, removal and the
 * stock or availability message of each line.
 *
 * @see specs/001-catalog-auth-cart/spec.md US4, edge case « produit supprimé »
 */
import { CircleAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductImage } from "@/features/catalog/components/ProductImage";
import { productPath } from "@/lib/constants/routes";
import { CartLineStatus } from "@/lib/enums/cart";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/schemas/cart";
import { THEME } from "@/lib/theme/theme.config";

import { CART_FEEDBACK_MESSAGES, CART_MESSAGES } from "../messages";

import { QuantityStepper } from "./QuantityStepper";

/** Props of {@link CartLines}. */
export interface CartLinesProps {
  readonly lines: readonly CartLine[];
  readonly disabled: boolean;
  readonly onSetQuantity: (productUuid: string, quantity: number) => void;
  readonly onRemove: (productUuid: string) => void;
}

/**
 * Message of a line that cannot be ordered as is.
 *
 * @param line - Displayed line.
 * @returns The message, or `undefined` when the line is fine.
 */
function lineProblem(line: CartLine): string | undefined {
  if (line.status === CartLineStatus.UNAVAILABLE) {
    return CART_FEEDBACK_MESSAGES.lineUnavailable;
  }
  if (line.status === CartLineStatus.INSUFFICIENT_STOCK) {
    return CART_FEEDBACK_MESSAGES.lineInsufficientStock(line.availableStock ?? 0);
  }
  return undefined;
}

/**
 * One cart line.
 *
 * @param props - The line and the handlers.
 * @returns The list item.
 */
function CartLineItem({
  line,
  disabled,
  onSetQuantity,
  onRemove,
}: Omit<CartLinesProps, "lines"> & { readonly line: CartLine }): ReactNode {
  const unavailable = line.status === CartLineStatus.UNAVAILABLE;
  const name = line.name === "" ? CART_MESSAGES.deletedProductName : line.name;
  const problem = lineProblem(line);
  return (
    <li
      className="glass grid grid-cols-12 items-center gap-4 rounded-card p-4"
      data-status={line.status}
    >
      <div className="col-span-2 aspect-4/3 overflow-hidden rounded-field bg-surface-2">
        <ProductImage src={line.imageUrl} alt="" category="" media={THEME.media.thumbnail} />
      </div>
      <div className="col-span-4 flex flex-col gap-1">
        {unavailable ? (
          <p className="text-text-muted">{name}</p>
        ) : (
          <Link href={productPath(line.productUuid)} className="hover:text-brand-text">
            {name}
          </Link>
        )}
        <p className="text-xs text-text-muted">
          {CART_MESSAGES.unitPrice} : <span className="price">{formatPrice(line.unitPrice)}</span>
        </p>
        {problem && (
          <p className="inline-flex items-center gap-1.5 text-xs text-rose">
            <CircleAlert aria-hidden className="size-3.5" />
            {problem}
          </p>
        )}
      </div>
      <QuantityStepper
        className="col-span-3 justify-self-start"
        value={line.quantity}
        label={CART_MESSAGES.lineQuantityLabel(name)}
        disabled={disabled || unavailable}
        onChange={(quantity) => {
          onSetQuantity(line.productUuid, quantity);
        }}
      />
      <p className="price col-span-2 text-right">
        <span className="sr-only">{CART_MESSAGES.subtotal} : </span>
        {formatPrice(line.lineTotal)}
      </p>
      <button
        type="button"
        aria-label={CART_MESSAGES.removeLine(name)}
        disabled={disabled}
        onClick={() => {
          onRemove(line.productUuid);
        }}
        className="col-span-1 inline-flex size-9 items-center justify-center justify-self-end rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-rose disabled:opacity-40"
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    </li>
  );
}

/**
 * List of the cart lines.
 *
 * @param props - Lines, busy state and handlers.
 * @returns The list.
 */
export function CartLines({ lines, ...handlers }: CartLinesProps): ReactNode {
  return (
    <ul aria-label={CART_MESSAGES.linesLabel} className="flex flex-col gap-3">
      {lines.map((line) => (
        <CartLineItem key={line.productUuid} line={line} {...handlers} />
      ))}
    </ul>
  );
}
