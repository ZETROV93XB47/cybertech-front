/**
 * Class name helper shared by every component (shadcn/ui convention).
 *
 * Combines conditional class names (`clsx`) and resolves Tailwind conflicts
 * (`tailwind-merge`) so that a caller's `className` reliably overrides a component default.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier conflicting ones.
 *
 * @param inputs - Class names, arrays or conditional objects accepted by `clsx`.
 * @returns A single, deduplicated class string.
 */
export function cn(...inputs: readonly ClassValue[]): string {
  return twMerge(clsx(inputs));
}
