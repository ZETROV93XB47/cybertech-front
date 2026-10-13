/**
 * Theme and interface-preference enums (constitution XIII, research R18).
 *
 * Every user-adjustable option is one of these bounded values; there is no free colour or size.
 */

/** Accent colour variant. Every variant is validated for WCAG AA in `THEME`. */
export enum AccentVariant {
  /** Default accent of the « Aurora Glow » direction. */
  VIOLET = "violet",
  BLUE = "blue",
  CYAN = "cyan",
}

/** Amount of decorative effects (dot grid, aurora, tilt, magnetic buttons, smooth scroll). */
export enum EffectsLevel {
  FULL = "full",
  /** Static or slowed-down background effects, no tilt and no magnetic pull. */
  REDUCED = "reduced",
  OFF = "off",
}

/** Intensity of UI animations (durations and amplitudes). */
export enum MotionIntensity {
  NORMAL = "normal",
  /** Longer, smaller movements for users who find the default too lively. */
  SOFT = "soft",
}

/** Whether interface sounds are played. Off by default (spec US5). */
export enum SoundSetting {
  ON = "on",
  OFF = "off",
}

/** Short interface sounds, generated with the Web Audio API (no audio file). */
export enum UiSound {
  ADD_TO_CART = "add-to-cart",
  MERGE_SUCCESS = "merge-success",
  ERROR = "error",
}

/** Attributes set on `<html>` so CSS variants follow the preferences. */
export enum ThemeDataAttribute {
  ACCENT = "data-accent",
  EFFECTS = "data-effects",
  MOTION = "data-motion",
}
