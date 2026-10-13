/**
 * « Vole vers le panier » (spec annex « Panier vivant »): after a successful add, a small gold
 * dot travels from the button to the header cart badge, which then bounces (CartBadge).
 *
 * Web Animations API, on the compositor (transform and opacity only); skipped when the
 * effective effects level is OFF (preference or system reduced motion).
 */
import { useCallback } from "react";

import {
  useEffectiveEffects,
  useMotionIntensity,
} from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { THEME } from "@/lib/theme/theme.config";

/** Attribute marking the element the dot flies to. */
export const CART_TARGET_ATTRIBUTE = "data-cart-target";

/** Divisor giving the centre of an element. */
const HALF_DIVISOR = 2;

/** Scale of the dot when it reaches the badge. */
const ARRIVAL_SCALE = 0.4;

/** Opacity of the dot when it reaches the badge. */
const ARRIVAL_OPACITY = 0.2;

/** Classes of the flying dot (gold, round, above everything, never clickable). */
const DOT_CLASSES = "pointer-events-none fixed z-50 size-3 rounded-full bg-gold";

/**
 * Centre of an element in viewport coordinates.
 *
 * @param element - Element.
 * @returns Its centre.
 */
function centreOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / HALF_DIVISOR, y: box.top + box.height / HALF_DIVISOR };
}

/**
 * Animates a dot from an element to the cart badge.
 *
 * @param source - Element the dot leaves from.
 * @param durationMs - Flight duration.
 * @param easing - CSS easing.
 * @returns `true` when the animation started.
 */
export function flyToCart(source: Element, durationMs: number, easing: string): boolean {
  const target = document.querySelector(`[${CART_TARGET_ATTRIBUTE}]`);
  if (!target) {
    return false;
  }
  const from = centreOf(source);
  const to = centreOf(target);
  const dot = document.createElement("span");
  dot.className = DOT_CLASSES;
  dot.style.left = `${from.x}px`;
  dot.style.top = `${from.y}px`;
  document.body.append(dot);
  const flight = dot.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      {
        transform: `translate(calc(${to.x - from.x}px - 50%), calc(${to.y - from.y}px - 50%)) scale(${ARRIVAL_SCALE})`,
        opacity: ARRIVAL_OPACITY,
      },
    ],
    { duration: durationMs, easing },
  );
  flight.onfinish = () => {
    dot.remove();
  };
  return true;
}

/**
 * Returns the function launching the flight, or a no-op when effects are off.
 *
 * @returns `fly(source)`.
 */
export function useFlyToCart(): (source: Element | null) => void {
  const { level } = useEffectiveEffects();
  const motion = THEME.motion[useMotionIntensity()];
  return useCallback(
    (source: Element | null) => {
      if (!source || level === EffectsLevel.OFF) {
        return;
      }
      const [x1, y1, x2, y2] = motion.easing;
      flyToCart(source, motion.durationSlowMs, `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`);
    },
    [level, motion],
  );
}
