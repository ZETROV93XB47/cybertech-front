"use client";

/**
 * Comparison table: one column per product (photo, name, brand, price, live stock, add to
 * cart), then one row per characteristic with one value per product.
 *
 * Column headers are the products and row headers the characteristics, so a screen reader reads
 * « Processeur, PC A : AMD Ryzen 7 » (FR-020). A row whose values differ carries an icon and a
 * hidden « valeurs différentes » text, never a colour alone (FR-019). Only the table scrolls
 * horizontally when it is wider than the modal.
 *
 * @see specs/002-catalog-refresh/spec.md FR-018 to FR-020
 */
import { Diff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { AvailabilityBadge } from "@/features/catalog/components/AvailabilityBadge";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { BRAND_LABELS } from "@/features/catalog/messages";
import { productPath } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/format";
import type { ComparisonRow, ComparisonView } from "@/lib/schemas/compare";
import type { ProductCard } from "@/lib/schemas/product";
import { THEME } from "@/lib/theme/theme.config";

import { COMPARE_DIALOG_MESSAGES } from "../messages";

/** Props of {@link CompareTable}. */
export interface CompareTableProps {
  readonly view: ComparisonView;
  /** Keeps only the rows whose values differ. */
  readonly differencesOnly: boolean;
}

/**
 * Column header of one product.
 *
 * @param props - The product.
 * @returns The header cell.
 */
function ProductHeader({ product }: { readonly product: ProductCard }): ReactNode {
  return (
    <th scope="col" className="w-64 p-3 text-left align-top font-normal">
      <div className="flex flex-col gap-2">
        <div className="aspect-4/3 overflow-hidden rounded-field bg-surface-2">
          <ProductImage
            src={product.imageUrl}
            alt=""
            category={product.category}
            media={THEME.media.card}
          />
        </div>
        <span className="text-xs text-text-muted">{BRAND_LABELS[product.brand]}</span>
        <Link href={productPath(product.uuid)} className="line-clamp-2 text-sm text-text">
          {product.name}
        </Link>
        <span className="price text-lg">{formatPrice(product.price)}</span>
        <div className="flex items-center justify-between gap-2">
          <AvailabilityBadge productUuid={product.uuid} />
          <AddToCartButton productUuid={product.uuid} productName={product.name} compact />
        </div>
      </div>
    </th>
  );
}

/**
 * One characteristic row.
 *
 * @param props - The row.
 * @returns The table row.
 */
function CharacteristicRow({ row }: { readonly row: ComparisonRow }): ReactNode {
  return (
    <tr className="border-t border-border">
      <th scope="row" className="p-3 text-left align-top text-sm font-normal text-text-muted">
        <span className="inline-flex items-center gap-2">
          {row.label}
          {row.differs && (
            <>
              <Diff aria-hidden className="size-3.5 text-gold" />
              <span className="sr-only">{COMPARE_DIALOG_MESSAGES.differs}</span>
            </>
          )}
        </span>
      </th>
      {row.values.map((value, index) => (
        <td key={index} className="p-3 align-top text-sm text-text">
          {value ?? COMPARE_DIALOG_MESSAGES.missingValue}
        </td>
      ))}
    </tr>
  );
}

/**
 * Comparison table, or a message when « differences only » leaves no row.
 *
 * @param props - View and filter.
 * @returns The table.
 */
export function CompareTable({ view, differencesOnly }: CompareTableProps): ReactNode {
  const rows = differencesOnly ? view.rows.filter((row) => row.differs) : view.rows;
  if (differencesOnly && rows.length === 0) {
    return <p className="p-6 text-sm text-text-muted">{COMPARE_DIALOG_MESSAGES.noDifference}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">{COMPARE_DIALOG_MESSAGES.title}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-48 p-3 text-left align-bottom text-xs text-text-muted">
              {COMPARE_DIALOG_MESSAGES.characteristic}
            </th>
            {view.products.map((product) => (
              <ProductHeader key={product.uuid} product={product} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CharacteristicRow key={row.key} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
