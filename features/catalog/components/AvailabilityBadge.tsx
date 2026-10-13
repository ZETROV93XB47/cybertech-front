"use client";

/**
 * Live availability badge: « En stock », « Plus que N » or « Rupture » (FR-007).
 *
 * The state is always written out and paired with an icon, never shown by colour alone (FR-039).
 * The badge is a live region so a screen reader hears the stock once it has been checked.
 */
import { Check, CircleSlash, Hourglass } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { AvailabilityLevel } from "@/lib/enums/availability-level";
import { toAvailabilityLevel, type ProductAvailability } from "@/lib/schemas/product";
import { cn } from "@/lib/utils";

import { useAvailability } from "../hooks/useAvailability";
import { AVAILABILITY_MESSAGES } from "../messages";

/** Props of {@link AvailabilityBadge}. */
export interface AvailabilityBadgeProps {
  readonly productUuid: string;
  /** Stock read on the server with the page (product page), to render without waiting. */
  readonly initialAvailability?: ProductAvailability | null;
  readonly className?: string;
}

/** Shared pill style. */
const PILL = "inline-flex items-center gap-1.5 text-xs font-medium";

/**
 * Renders the badge content of a known stock.
 *
 * @param availability - Live stock, `null` when the backend does not know the product.
 * @returns Icon and text.
 */
function renderLevel(availability: ProductAvailability | null): ReactNode {
  const level = availability ? toAvailabilityLevel(availability) : AvailabilityLevel.OUT;
  switch (level) {
    case AvailabilityLevel.IN:
      return (
        <span className={cn(PILL, "text-success")} data-level={level}>
          <Check aria-hidden className="size-3.5" />
          {AVAILABILITY_MESSAGES.inStock}
        </span>
      );
    case AvailabilityLevel.LOW:
      return (
        <span className={cn(PILL, "text-rose")} data-level={level}>
          <Hourglass aria-hidden className="size-3.5" />
          {AVAILABILITY_MESSAGES.lowStock(availability?.availableStock ?? 0)}
        </span>
      );
    case AvailabilityLevel.OUT:
      return (
        <span className={cn(PILL, "text-text-muted")} data-level={level}>
          <CircleSlash aria-hidden className="size-3.5" />
          {AVAILABILITY_MESSAGES.outOfStock}
        </span>
      );
    default:
      return assertNever(level);
  }
}

/**
 * Availability of one product, refreshed live.
 *
 * @param props - Product UUID and optional server-read stock.
 * @returns The badge.
 */
export function AvailabilityBadge({
  productUuid,
  initialAvailability,
  className,
}: AvailabilityBadgeProps): ReactNode {
  const query = useAvailability(productUuid, initialAvailability);
  let content: ReactNode;
  if (query.isPending) {
    content = <span className={cn(PILL, "text-text-muted")}>{AVAILABILITY_MESSAGES.checking}</span>;
  } else if (query.isError) {
    content = <span className={cn(PILL, "text-text-muted")}>{AVAILABILITY_MESSAGES.unknown}</span>;
  } else {
    content = renderLevel(query.data);
  }
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      {content}
    </span>
  );
}
