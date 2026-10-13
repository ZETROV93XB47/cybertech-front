/**
 * Exhaustiveness helper for `switch` statements over enums (constitution XII).
 *
 * Placing `assertNever(value)` in the `default` branch makes TypeScript fail the build as soon as
 * a new enum member is added without being handled, instead of silently falling through.
 */

/**
 * Signals an impossible branch: the value should have been narrowed to `never`.
 *
 * @param value - The value that escaped every `case`; typed `never` so the compiler checks it.
 * @returns Never returns.
 * @throws {Error} Always, if reached at runtime (e.g. a value that bypassed type checking).
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
