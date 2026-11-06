/**
 * Class name helper shared by every component (shadcn/ui convention).
 *
 * Combines conditional class names (`clsx`) and resolves Tailwind conflicts
 * (`tailwind-merge`) so that a caller's `className` reliably overrides a component default.
 */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Container widths added by the theme (`--container-site`, `--container-catalog` in
 * `styles/globals.css`): declared so that `max-w-catalog` overrides a component's `max-w-lg`
 * instead of depending on the CSS rule order.
 */
const THEME_CONTAINERS = ["site", "catalog"];

/**
 * Corner radii added by the theme (`--radius-card`, `--radius-button`, `--radius-field`):
 * declared so that `rounded-button` overrides a component's `rounded-md` (feature 003 T073).
 */
const THEME_RADII = ["card", "button", "field"];

/** `tailwind-merge` aware of the theme containers and radii. */
const twMerge = extendTailwindMerge({
  extend: { theme: { container: THEME_CONTAINERS, radius: THEME_RADII } },
});

/**
 * Merges class names, letting later Tailwind utilities win over earlier conflicting ones.
 *
 * @param inputs - Class names, arrays or conditional objects accepted by `clsx`.
 * @returns A single, deduplicated class string.
 */
export function cn(...inputs: readonly ClassValue[]): string {
  return twMerge(clsx(inputs));
}
