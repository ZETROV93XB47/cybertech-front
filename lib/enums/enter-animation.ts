/**
 * CSS entrances of server-rendered blocks (`styles/globals.css`).
 *
 * @see specs/002-catalog-refresh/research.md R14
 */

/** Kind of entrance; the value is the CSS class applying it. */
export enum EnterAnimation {
  /** Plain fade (active-filter pills). */
  FADE = "enter-fade",
  /** Fade and rise, a plain fade when effects are reduced (grid cards, home sections). */
  RISE = "enter-rise",
}
