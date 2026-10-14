"use client";

/**
 * Body of « Ma wishlist »: one glass row per product (photo, name, price, live stock, day of the
 * add), « Ajouter au panier » (disabled while out of stock) and « Retirer », then the pages.
 *
 * A removed row disappears at once; the server list is then refreshed so that the page stays
 * complete. Refusals are explained in a toast and the row stays.
 *
 * @see specs/003-account-orders/spec.md US6, FR-037
 */
import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { AvailabilityBadge } from "@/features/catalog/components/AvailabilityBadge";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/format";
import { THEME } from "@/lib/theme/theme.config";

import { useToggleWishlist } from "../hooks/useWishlist";
import { WISHLIST_MESSAGES } from "../messages";
import { wishlistErrorMessage } from "../wishlist-errors";
import { wishlistPagePath, type WishlistRow } from "../wishlist-view";

/** Props of {@link WishlistList}. */
export interface WishlistListProps {
  readonly rows: readonly WishlistRow[];
  /** 1-based current page. */
  readonly page: number;
  readonly totalPages: number;
}

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-9 items-center gap-2 rounded-button border border-border px-3 text-sm text-text transition-colors duration-(--duration-fast) hover:border-rose hover:text-rose";

/**
 * One product of the wishlist.
 *
 * @param props - Row and remove handler.
 * @returns The list item.
 */
function WishlistItemRow({
  row,
  onRemove,
}: {
  readonly row: WishlistRow;
  readonly onRemove: () => void;
}): ReactNode {
  return (
    <li className="glass flex items-center gap-5 rounded-card p-4">
      {/* Duplicate of the name link below: kept out of the tab order and the accessibility tree. */}
      <Link
        href={row.href}
        tabIndex={-1}
        aria-hidden
        className="w-32 shrink-0 overflow-hidden rounded-field bg-surface-2"
      >
        <ProductImage
          src={row.imageUrl}
          alt=""
          category={row.category}
          media={THEME.media.thumbnail}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={row.href} className="line-clamp-2 hover:text-brand-text">
          {row.name}
        </Link>
        <p className="price text-lg">{formatPrice(row.price)}</p>
        <AvailabilityBadge productUuid={row.productUuid} />
        {row.addedOn && (
          <p className="text-xs text-text-muted">{WISHLIST_MESSAGES.addedOn(row.addedOn)}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <AddToCartButton productUuid={row.productUuid} productName={row.name} compact />
        <button
          type="button"
          aria-label={WISHLIST_MESSAGES.removeLabel(row.name)}
          onClick={onRemove}
          className={SECONDARY_BUTTON}
        >
          <Trash2 aria-hidden className="size-4" />
          {WISHLIST_MESSAGES.removeButton}
        </button>
      </div>
    </li>
  );
}

/**
 * Previous / next links of the list.
 *
 * @param props - Current page and page count.
 * @returns The navigation, or nothing for a single page.
 */
function WishlistPager({ page, totalPages }: Omit<WishlistListProps, "rows">): ReactNode {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav
      aria-label={WISHLIST_MESSAGES.paginationLabel}
      className="flex items-center justify-between gap-4 text-sm"
    >
      {page > 1 ? (
        <Link href={wishlistPagePath(page - 1)} className={SECONDARY_BUTTON}>
          {WISHLIST_MESSAGES.previousPage}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-text-muted">{WISHLIST_MESSAGES.pageStatus(page, totalPages)}</span>
      {page < totalPages ? (
        <Link href={wishlistPagePath(page + 1)} className={SECONDARY_BUTTON}>
          {WISHLIST_MESSAGES.nextPage}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/**
 * Removes rows optimistically, then refreshes the server list.
 *
 * @returns The removed UUIDs and the remove action.
 */
function useRemoveRow(): {
  readonly removed: readonly string[];
  readonly remove: (row: WishlistRow) => Promise<void>;
} {
  const change = useToggleWishlist();
  const router = useRouter();
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const remove = async (row: WishlistRow): Promise<void> => {
    setRemoved((current) => [...current, row.productUuid]);
    const result = await change(row.productUuid, false);
    if (result.ok) {
      toast.success(WISHLIST_MESSAGES.removed(row.name));
      router.refresh();
      return;
    }
    setRemoved((current) => current.filter((uuid) => uuid !== row.productUuid));
    toast.error(wishlistErrorMessage(result.code));
  };
  return { removed, remove };
}

/**
 * « Ma wishlist » list.
 *
 * @param props - Rows of the page and pagination.
 * @returns The list, or the empty state.
 */
export function WishlistList({ rows, page, totalPages }: WishlistListProps): ReactNode {
  const { removed, remove } = useRemoveRow();
  const visible = rows.filter((row) => !removed.includes(row.productUuid));
  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-10" />}
        title={WISHLIST_MESSAGES.emptyTitle}
        body={WISHLIST_MESSAGES.emptyBody}
        action={{ href: CATALOG_PATH, label: WISHLIST_MESSAGES.goToCatalog }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ul aria-label={WISHLIST_MESSAGES.listLabel} className="flex flex-col gap-4">
        {visible.map((row) => (
          <WishlistItemRow key={row.productUuid} row={row} onRemove={() => void remove(row)} />
        ))}
      </ul>
      <WishlistPager page={page} totalPages={totalPages} />
    </div>
  );
}
