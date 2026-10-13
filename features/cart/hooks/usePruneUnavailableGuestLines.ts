/**
 * Removes from the guest cart the lines whose product no longer exists, and returns the message
 * telling the visitor about it (spec edge case « produit supprimé »).
 *
 * Account lines are not removed automatically: the backend keeps them, the page shows them as
 * unavailable and the user removes them.
 *
 * @see docs/guest-cart.md §3 (« Produit supprimé »)
 */
import { useEffect, useState } from "react";

import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import type { CartView } from "@/lib/schemas/cart";

import { readGuestCart, writeGuestCart } from "../guest-storage";
import { CART_FEEDBACK_MESSAGES } from "../messages";

/**
 * Prunes the deleted products of a guest cart view.
 *
 * @param cart - Displayed cart.
 * @returns The notice of the last pruning, or an empty string.
 */
export function usePruneUnavailableGuestLines(cart: CartView | undefined): string {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (cart?.source !== CartSource.GUEST) {
      return;
    }
    const gone = new Set(
      cart.lines
        .filter((line) => line.status === CartLineStatus.UNAVAILABLE)
        .map((line) => line.productUuid),
    );
    if (gone.size === 0) {
      return;
    }
    const storage = window.localStorage;
    const remaining = readGuestCart(storage).filter((line) => !gone.has(line.productUuid));
    if (writeGuestCart(storage, remaining)) {
      setNotice(CART_FEEDBACK_MESSAGES.removedUnavailable(gone.size));
    }
  }, [cart]);
  return notice;
}
