/**
 * Shared look of the header controls (search, preferences, account, cart), so every control of
 * the bar has the same height, icon size and hover state (US3 scenario 1).
 *
 * @see specs/002-catalog-refresh/spec.md US3
 */

/** Height, radius, text and hover state of every header control. */
export const HEADER_CONTROL_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button px-3 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:text-text";

/** Square variant, for the icon-only controls (preferences, cart). */
export const HEADER_ICON_BUTTON_CLASS =
  "inline-flex size-10 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-text";

/** Size of every header icon. */
export const HEADER_ICON_CLASS = "size-5";

/** Height, radius, text and hover state of the main navigation entries (links and menu trigger). */
export const NAV_ITEM_CLASS =
  "relative inline-flex h-10 items-center gap-1 rounded-button px-3 text-sm transition-colors duration-(--duration-fast) hover:text-text";
