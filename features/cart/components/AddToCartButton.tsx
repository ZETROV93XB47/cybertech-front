"use client";

/**
 * « Ajouter au panier » of the product page (with a quantity stepper) and of the product cards
 * (compact, one unit). Works the same for a visitor and a signed-in user through `useCart`.
 *
 * Disabled while the live stock says « Rupture » (US4-7). A refused add explains why, with the
 * available quantity (« Il n'en reste que N »); the cart is then left unchanged.
 *
 * @see specs/001-catalog-auth-cart/spec.md US4
 */
import { Check, ShoppingBag } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useAvailability } from "@/features/catalog/hooks/useAvailability";
import { useUiSound } from "@/features/preferences/hooks/useUiSound";
import { CART_LINE_MIN_QUANTITY } from "@/lib/constants/cart";
import { AvailabilityLevel } from "@/lib/enums/availability-level";
import { UiSound } from "@/lib/enums/theme";
import { toAvailabilityLevel } from "@/lib/schemas/product";
import { cn } from "@/lib/utils";

import { useCart, type CartChangeResult } from "../hooks/useCart";
import { CART_MESSAGES } from "../messages";

import { QuantityStepper } from "./QuantityStepper";

/** Props of {@link AddToCartButton}. */
export interface AddToCartButtonProps {
  readonly productUuid: string;
  /** Product name, for the accessible label of the compact button. */
  readonly productName: string;
  /** Card variant: one unit, icon button, feedback in a toast. */
  readonly compact?: boolean;
  readonly className?: string;
}

/** Style of the call to action. */
const CTA =
  "cta-gradient inline-flex items-center justify-center gap-2 rounded-button font-medium transition-opacity duration-(--duration-fast) disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Tells whether the product cannot be added: live stock known and at zero, or unknown product.
 *
 * @param productUuid - Product.
 * @returns `true` when the add button must be disabled.
 */
function useIsOutOfStock(productUuid: string): boolean {
  const availability = useAvailability(productUuid);
  if (availability.data === undefined) {
    return false;
  }
  return (
    availability.data === null || toAvailabilityLevel(availability.data) === AvailabilityLevel.OUT
  );
}

/**
 * Compact add button of a product card.
 *
 * @param props - Product and style.
 * @returns The icon button.
 */
function CompactAddButton({
  productUuid,
  productName,
  className,
}: AddToCartButtonProps): ReactNode {
  const { add, isMutating, isReady } = useCart();
  const play = useUiSound();
  const outOfStock = useIsOutOfStock(productUuid);
  const onAdd = async (): Promise<void> => {
    const result = await add(productUuid, CART_LINE_MIN_QUANTITY);
    play(result.ok ? UiSound.ADD_TO_CART : UiSound.ERROR);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };
  return (
    <button
      type="button"
      aria-label={
        outOfStock ? CART_MESSAGES.outOfStockButton : CART_MESSAGES.addProductToCart(productName)
      }
      disabled={!isReady || outOfStock || isMutating}
      onClick={() => void onAdd()}
      className={cn(CTA, "relative z-10 size-9", className)}
    >
      <ShoppingBag aria-hidden className="size-4" />
    </button>
  );
}

/**
 * Feedback line under the full button: success or refusal, announced politely.
 *
 * @param props - Last result.
 * @returns The live region.
 */
function Feedback({ result }: { readonly result: CartChangeResult | null }): ReactNode {
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-sm">
      {result && <span className={result.ok ? "text-success" : "text-rose"}>{result.message}</span>}
    </p>
  );
}

/**
 * Add-to-cart block of the product page: stepper, button, « already in cart » and feedback.
 *
 * @param props - Product and style.
 * @returns The block.
 */
function FullAddToCart({ productUuid, className }: AddToCartButtonProps): ReactNode {
  const { add, cart, isMutating, isReady } = useCart();
  const play = useUiSound();
  const outOfStock = useIsOutOfStock(productUuid);
  const [quantity, setQuantity] = useState(CART_LINE_MIN_QUANTITY);
  const [result, setResult] = useState<CartChangeResult | null>(null);
  const inCart = cart?.lines.find((line) => line.productUuid === productUuid)?.quantity ?? 0;
  const onAdd = async (): Promise<void> => {
    const outcome = await add(productUuid, quantity);
    play(outcome.ok ? UiSound.ADD_TO_CART : UiSound.ERROR);
    setResult(outcome);
  };
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          label={CART_MESSAGES.quantityLabel}
          disabled={outOfStock}
          active={inCart > 0}
        />
        <button
          type="button"
          disabled={!isReady || outOfStock || isMutating}
          onClick={() => void onAdd()}
          className={cn(CTA, "h-11 px-6")}
        >
          <ShoppingBag aria-hidden className="size-4" />
          {outOfStock ? CART_MESSAGES.outOfStockButton : CART_MESSAGES.addToCart}
        </button>
      </div>
      {inCart > 0 && (
        <p className="inline-flex items-center gap-1.5 text-sm text-success">
          <Check aria-hidden className="size-4" />
          {CART_MESSAGES.inCart(inCart)}
        </p>
      )}
      <Feedback result={result} />
    </div>
  );
}

/**
 * Add-to-cart block of the product page, or the compact button of a card.
 *
 * @param props - Product, variant and style.
 * @returns The button (and stepper on the product page).
 */
export function AddToCartButton(props: AddToCartButtonProps): ReactNode {
  return props.compact ? <CompactAddButton {...props} /> : <FullAddToCart {...props} />;
}
