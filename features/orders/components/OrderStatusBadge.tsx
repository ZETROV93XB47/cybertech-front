/**
 * Status badge of an order: the French label of the status, always written, coloured by its
 * tone through theme tokens (never conveyed by colour alone) with a matching icon.
 *
 * @see specs/003-account-orders/data-model.md §4.4
 */
import { CheckCircle2, CircleDot, MinusCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { type OrderStatus, StatusTone } from "@/lib/enums/order";
import { cn } from "@/lib/utils";

import { ORDERS_MESSAGES } from "../messages";

/** Look of a tone: border and text colours, and its icon. */
interface ToneStyle {
  readonly className: string;
  readonly icon: LucideIcon;
}

/**
 * Look of a tone.
 *
 * @param tone - Status tone.
 * @returns Its classes and icon.
 */
export function toneStyle(tone: StatusTone): ToneStyle {
  switch (tone) {
    case StatusTone.PROGRESS:
      return { className: "border-brand-text text-brand-text", icon: CircleDot };
    case StatusTone.SUCCESS:
      return { className: "border-success text-success", icon: CheckCircle2 };
    case StatusTone.WARNING:
      return { className: "border-rose text-rose", icon: TriangleAlert };
    case StatusTone.NEUTRAL:
      return { className: "border-border text-text-muted", icon: MinusCircle };
    default:
      return assertNever(tone);
  }
}

/** Props of {@link OrderStatusBadge}. */
export interface OrderStatusBadgeProps {
  readonly status: OrderStatus;
  readonly tone: StatusTone;
  readonly className?: string;
}

/**
 * Status badge.
 *
 * @param props - Status and tone.
 * @returns The badge.
 */
export function OrderStatusBadge({ status, tone, className }: OrderStatusBadgeProps): ReactNode {
  const { className: toneClass, icon: Icon } = toneStyle(tone);
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-button border px-3 py-1 text-xs font-medium",
        toneClass,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {ORDERS_MESSAGES.statusLabels[status]}
    </span>
  );
}
