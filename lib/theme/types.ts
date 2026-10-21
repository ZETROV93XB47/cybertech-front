/**
 * Shape of the theme configuration (constitution XIII).
 *
 * Every variant table is indexed by an enum, so adding a variant without its values does not
 * compile. CSS values are strings (`"20px"`, `"#0A0E1F"`); numeric effect parameters used by
 * canvas code are numbers with their unit in the field name.
 */
import type { AccentVariant, EffectsLevel, MotionIntensity, UiSound } from "@/lib/enums/theme";

/** A CSS colour value (hex or rgba). */
export type CssColor = string;

/** A CSS length or duration value with its unit. */
export type CssValue = string;

/** Base palette of the « Aurora Glow » direction (spec annex). */
export interface ThemePalette {
  readonly bg: CssColor;
  readonly surface: CssColor;
  readonly surface2: CssColor;
  readonly border: CssColor;
  readonly text: CssColor;
  readonly textMuted: CssColor;
  /** Premium signature: prices and badges only, never a background. */
  readonly gold: CssColor;
  /** Soft alerts, rare. */
  readonly rose: CssColor;
  /**
   * Background behind product photos: the colour of the photos' own backdrop, so a photo shown
   * whole (`object-contain`) fills its frame without dark side bands.
   */
  readonly photoBackdrop: CssColor;
}

/** Token set of one accent variant. */
export interface AccentTokens {
  /** Fills, glows, gradients. */
  readonly accent: CssColor;
  /** Accent used for text and focus rings on surfaces (AA on every surface). */
  readonly accentText: CssColor;
  /** Text placed on an accent fill (AA on `accent`, `gradientFrom`, `gradientTo`). */
  readonly onAccent: CssColor;
  /** Halo around the primary call to action. */
  readonly accentGlow: CssColor;
  readonly gradientFrom: CssColor;
  readonly gradientTo: CssColor;
  /** Success / active state; distinct from the accent of the same variant. */
  readonly success: CssColor;
}

/** Typography tokens; font families come from `next/font` CSS variables. */
export interface ThemeTypography {
  readonly fontHeading: CssValue;
  readonly fontBody: CssValue;
  readonly fontMono: CssValue;
  readonly headingWeight: number;
  readonly headingWeightStrong: number;
  readonly bodyWeight: number;
  readonly headingLetterSpacing: CssValue;
  readonly bodyLineHeight: number;
}

/** Shapes, borders and glass effect. */
export interface ThemeShape {
  readonly radiusCard: CssValue;
  readonly radiusButton: CssValue;
  readonly radiusField: CssValue;
  readonly borderWidth: CssValue;
  readonly glassOpacity: number;
  readonly glassBlur: CssValue;
  readonly focusRingWidth: CssValue;
  readonly focusRingOffset: CssValue;
  /** Direction of the call-to-action gradient. */
  readonly ctaGradientAngle: CssValue;
  /** Share of accent mixed into the skeleton shimmer highlight. */
  readonly shimmerAccentMix: CssValue;
}

/** Violet-tinted shadows (never black, spec annex). */
export interface ThemeShadows {
  readonly card: CssValue;
  readonly cardHover: CssValue;
  readonly cta: CssValue;
  /** Dark neumorphism of the quantity stepper: soft raised surface. */
  readonly neumorphicRaised: CssValue;
  /** Dark neumorphism of the quantity stepper: pressed (inset) field. */
  readonly neumorphicInset: CssValue;
}

/** Durations and movements of one motion intensity. */
export interface MotionTokens {
  readonly durationFastMs: number;
  readonly durationBaseMs: number;
  readonly durationSlowMs: number;
  readonly revealOffsetPx: number;
  /** Rise of the panels that slide in from the bottom of the screen (comparison bar). */
  readonly slideOffsetPx: number;
  readonly staggerMs: number;
  /** Cubic-bezier control points of the shared ease-out. */
  readonly easing: readonly [number, number, number, number];
}

/** Reactive dot grid behind the content. */
export interface DotGridSettings {
  readonly enabled: boolean;
  /** When false, the grid is drawn once and does not react to the cursor. */
  readonly interactive: boolean;
  readonly radiusPx: number;
  readonly spacingPx: number;
  readonly dotSizePx: number;
  readonly maxScale: number;
  readonly pushPx: number;
  /** Fraction of the remaining distance covered per frame (0–1): lower = more inertia. */
  readonly inertia: number;
  readonly restOpacity: number;
  readonly activeOpacity: number;
}

/** Blurred aurora blobs. */
export interface AuroraSettings {
  readonly enabled: boolean;
  readonly animated: boolean;
  readonly blobCount: number;
  readonly minCycleSeconds: number;
  readonly maxCycleSeconds: number;
  readonly blurPx: number;
  readonly opacity: number;
  /** Fraction of the cursor offset followed per frame (0–1). */
  readonly followStrength: number;
}

/** Settings of every decorative effect for one effects level. */
export interface EffectsSettings {
  readonly dotGrid: DotGridSettings;
  readonly aurora: AuroraSettings;
  /** 3D tilt of product cards; `perspectivePx` is the viewer distance of the 3D effect. */
  readonly tilt: {
    readonly enabled: boolean;
    readonly maxDeg: number;
    readonly perspectivePx: number;
  };
  readonly magnetic: {
    readonly enabled: boolean;
    readonly strength: number;
    readonly radiusPx: number;
  };
  readonly smoothScroll: { readonly enabled: boolean; readonly durationSeconds: number };
  /** Magnifier of the product photo on hover; `scale` is the zoom factor. */
  readonly galleryZoom: { readonly enabled: boolean; readonly scale: number };
  readonly viewTransitions: { readonly enabled: boolean };
  readonly liveTitle: {
    readonly enabled: boolean;
    readonly weightMin: number;
    readonly weightMax: number;
    readonly radiusPx: number;
  };
  /** Vertical lift of a hovered card. */
  readonly cardHoverLift: CssValue;
  /**
   * Home carousel (feature 004 US3): automatic rotation and cross-fade between slides. Without
   * autoplay the slides only change on the visitor's request, instantly when `crossFade` is
   * off (FR-010).
   */
  readonly carousel: {
    readonly autoplay: boolean;
    /** Time a slide stays on screen before the next one. */
    readonly intervalMs: number;
    readonly crossFade: boolean;
  };
}

/** One generated interface sound. */
export interface SoundTone {
  readonly frequencyHz: number;
  readonly durationMs: number;
  readonly waveform: OscillatorType;
}

/** Interface sounds (off by default). */
export interface ThemeSound {
  /** Gain of every sound, 0–1. Kept low: sounds are discreet by design. */
  readonly volume: number;
  readonly tones: Readonly<Record<UiSound, SoundTone>>;
}

/** Size of an image slot, used by `next/image`. */
export interface MediaSize {
  readonly width: number;
  readonly height: number;
  /** `sizes` attribute: rendered width per viewport, so the browser picks the right file. */
  readonly sizes: string;
}

/** Image sizes of the catalog. */
export interface ThemeMedia {
  readonly card: MediaSize;
  readonly gallery: MediaSize;
  readonly thumbnail: MediaSize;
  /** Banner photo at the top of the home page. */
  readonly hero: MediaSize;
  /** Photo of a home carousel slide or of a campaign (16:9 files in `public/images/`). */
  readonly slide: MediaSize;
  /** Campaign photo on a card of the « Promotions » page (same grid as the product cards). */
  readonly campaignCard: MediaSize;
  /** Campaign photo on its own page (half of the content width on large screens). */
  readonly campaignDetail: MediaSize;
}

/** Page layout tokens. */
export interface ThemeLayout {
  readonly containerMaxWidth: CssValue;
  /**
   * Width of the catalog page: the site width plus the filter column and its gap, so the
   * results area is as wide as the home page content and the cards have the same size.
   */
  readonly catalogMaxWidth: CssValue;
  readonly headerHeight: CssValue;
}

/** Complete theme: the single source of every visual value. */
export interface ThemeConfig {
  readonly palette: ThemePalette;
  readonly defaultAccent: AccentVariant;
  readonly accents: Readonly<Record<AccentVariant, AccentTokens>>;
  readonly typography: ThemeTypography;
  readonly shape: ThemeShape;
  readonly shadows: ThemeShadows;
  readonly motion: Readonly<Record<MotionIntensity, MotionTokens>>;
  readonly effects: Readonly<Record<EffectsLevel, EffectsSettings>>;
  readonly sound: ThemeSound;
  readonly media: ThemeMedia;
  readonly layout: ThemeLayout;
}
