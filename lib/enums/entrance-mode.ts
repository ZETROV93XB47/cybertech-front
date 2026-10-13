/**
 * How an element enters the screen, depending on the effects actually applied.
 *
 * @see specs/002-catalog-refresh/research.md R14
 */

/** Entrance of the animated surfaces of feature 002 (bar, modal, navigation underline). */
export enum EntranceMode {
  /** Effects at full level: fade with a movement (slide, scale, sliding underline). */
  MOVE = "move",
  /** Effects reduced or off, or system reduced motion: plain fade, no transform. */
  FADE = "fade",
}
