/**
 * Debounced copy of a value, for inputs that trigger a request on every keystroke.
 */
import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs`.
 *
 * @param value - Value that changes often (e.g. the text of a search input).
 * @param delayMs - Quiet time before the debounced value follows.
 * @returns The last value that stayed stable for `delayMs`.
 */
export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);
  return debounced;
}
