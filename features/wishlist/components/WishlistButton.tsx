"use client";

/**
 * Wishlist heart of a product card and of the product page (FR-035).
 *
 * Signed in: a click adds or removes the product at once (optimistic), and the heart goes back
 * to its previous state with a message when the backend refuses. Visitor: the product is kept
 * aside and the sign-in page opens; the add is replayed on return (FR-038). The button sits
 * above the stretched link of the card (`relative z-10`), so it never opens the product page.
 *
 * @see specs/003-account-orders/spec.md US6, FR-035, FR-038
 * @see specs/003-account-orders/research.md R22
 */
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { loginPath } from "@/lib/auth/callback-url";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { WishlistButtonVariant } from "@/lib/enums/wishlist-button-variant";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

import { useToggleWishlist, useWishlistIds } from "../hooks/useWishlist";
import { WISHLIST_MESSAGES } from "../messages";
import { wishlistErrorMessage } from "../wishlist-errors";
import { storeWishlistPending } from "../wishlist-pending";

/** Scale the heart starts from when it fills (full effects only). */
const HEART_POP_SCALE = 0.6;

/** Style of each variant. */
const VARIANT_CLASS = {
  [WishlistButtonVariant.CARD]:
    "size-9 justify-center rounded-full border border-border bg-surface/90 shadow-card backdrop-blur-sm",
  [WishlistButtonVariant.DETAIL]: "h-10 gap-2 rounded-button border border-border px-4 text-sm",
} as const satisfies Record<WishlistButtonVariant, string>;

/** Props of {@link WishlistButton}. */
export interface WishlistButtonProps {
  readonly productUuid: string;
  /** Product name, for the accessible label and the messages. */
  readonly productName: string;
  readonly variant: WishlistButtonVariant;
  readonly className?: string;
}

/**
 * The heart icon, popping when it fills.
 *
 * @param props - Filled state.
 * @returns The animated icon.
 */
function HeartIcon({ isActive }: { readonly isActive: boolean }): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const from = mode === EntranceMode.MOVE && isActive ? { scale: HEART_POP_SCALE } : false;
  return (
    <motion.span
      key={String(isActive)}
      aria-hidden
      data-entrance={mode}
      initial={from}
      animate={{ scale: 1 }}
      transition={tokens.fast}
      className="inline-flex"
    >
      <Heart className={cn("size-4", isActive && "fill-current")} />
    </motion.span>
  );
}

/**
 * Sends a visitor (or an expired session) to the sign-in page, the product kept aside.
 *
 * @param productUuid - Product to add on return.
 * @param push - Router navigation.
 * @param pathname - Current path.
 */
function signInThenAdd(productUuid: string, push: (href: string) => void, pathname: string): void {
  storeWishlistPending(window.sessionStorage, { productUuid });
  toast.info(WISHLIST_MESSAGES.signInToAdd);
  push(loginPath(`${pathname}${window.location.search}`));
}

/**
 * Click handler of the heart.
 *
 * @param props - Product.
 * @returns The current state and the handler.
 */
function useHeart({ productUuid, productName }: WishlistButtonProps): {
  readonly isActive: boolean;
  readonly isReady: boolean;
  readonly onClick: () => Promise<void>;
} {
  const { isSignedIn, isReady, has } = useWishlistIds();
  const change = useToggleWishlist();
  const router = useRouter();
  const push = (href: string): void => {
    router.push(href);
  };
  const pathname = usePathname();
  const isActive = has(productUuid);
  const onClick = async (): Promise<void> => {
    if (!isSignedIn) {
      signInThenAdd(productUuid, push, pathname);
      return;
    }
    const result = await change(productUuid, !isActive);
    if (result.ok) {
      toast.success(
        isActive ? WISHLIST_MESSAGES.removed(productName) : WISHLIST_MESSAGES.added(productName),
      );
    } else if (result.code === FrontErrorCode.UNAUTHENTICATED && !isActive) {
      signInThenAdd(productUuid, push, pathname);
    } else {
      toast.error(wishlistErrorMessage(result.code));
    }
  };
  return { isActive, isReady, onClick };
}

/**
 * Wishlist heart.
 *
 * @param props - Product, variant and style.
 * @returns The toggle button.
 */
export function WishlistButton(props: WishlistButtonProps): ReactNode {
  const { productName, variant, className } = props;
  const { isActive, isReady, onClick } = useHeart(props);
  const label = isActive
    ? WISHLIST_MESSAGES.remove(productName)
    : WISHLIST_MESSAGES.add(productName);
  const detailLabel = isActive ? WISHLIST_MESSAGES.detailRemove : WISHLIST_MESSAGES.detailAdd;
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={variant === WishlistButtonVariant.CARD ? label : undefined}
      disabled={!isReady}
      data-testid="wishlist-button"
      onClick={() => void onClick()}
      className={cn(
        "relative z-10 inline-flex items-center text-text transition-colors duration-(--duration-fast) hover:border-rose hover:text-rose disabled:opacity-50",
        VARIANT_CLASS[variant],
        isActive && "border-rose text-rose",
        className,
      )}
    >
      <HeartIcon isActive={isActive} />
      {variant === WishlistButtonVariant.DETAIL && <span>{detailLabel}</span>}
    </button>
  );
}
