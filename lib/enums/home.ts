/**
 * Enums of the home carousel (feature 004 US3).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §1, §3
 */

/** What a carousel slide leads to. */
export enum SlideKind {
  /** A product category: the slide opens the catalog filtered on it. */
  CATEGORY = "category",
  /** A running discount campaign: the slide opens its page. */
  CAMPAIGN = "campaign",
}

/** Playback state of the carousel rotation. */
export enum CarouselPlayback {
  /** Rotates by itself (paused while hovered, focused or hidden). */
  PLAYING = "playing",
  /** Stopped by the visitor with the pause button. */
  PAUSED = "paused",
  /** No rotation at all: reduced or disabled effects, reduced motion, or a single slide. */
  DISABLED = "disabled",
}
