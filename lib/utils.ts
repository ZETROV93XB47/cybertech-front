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

/** `tailwind-merge` aware of the theme containers. */
const twMerge = extendTailwindMerge({ extend: { theme: { container: THEME_CONTAINERS } } });

/**
 * Merges class names, letting later Tailwind utilities win over earlier conflicting ones.
 *
 * @param inputs - Class names, arrays or conditional objects accepted by `clsx`.
 * @returns A single, deduplicated class string.
 */
export function cn(...inputs: readonly ClassValue[]): string {
  return twMerge(clsx(inputs));
}
