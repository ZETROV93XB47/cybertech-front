/**
 * Type of the `toHaveNoViolations` matcher registered from `jest-axe` in `tests/setup.ts`.
 */
import "vitest";

declare module "vitest" {
  // Same type parameters as Vitest's declaration, required for interface merging.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /** Passes when an axe report has no violation. */
    toHaveNoViolations(): R;
  }
}
