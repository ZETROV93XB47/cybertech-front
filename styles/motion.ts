/**
 * Shared Motion tokens and variants, built from `THEME.motion` for the current intensity
 * (constitution XIII): components never hard-code a duration or an offset.
 */
import type { Transition, Variants } from "motion/react";

import {
  useEffectiveEffects,
  useMotionIntensity,
} from "@/features/preferences/PreferencesProvider";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { EffectsLevel } from "@/lib/enums/theme";
import { MS_PER_SECOND } from "@/lib/constants/time";
import { THEME } from "@/lib/theme/theme.config";

/** Motion values converted to the units Motion expects (seconds). */
export interface MotionTokensInSeconds {
  readonly fast: Transition;
  readonly base: Transition;
  readonly slow: Transition;
  /** Fade + vertical reveal used for entrance animations. */
  readonly reveal: Variants;
  /** Delay between children of a staggered entrance. */
  readonly staggerSeconds: number;
}

/**
 * Returns Motion transitions and variants for the user's motion intensity.
 *
 * @returns Transitions (fast, base, slow), the reveal variants and the stagger delay.
 */
export function useMotionTokens(): MotionTokensInSeconds {
  const tokens = THEME.motion[useMotionIntensity()];
  const [x1, y1, x2, y2] = tokens.easing;
  const ease: [number, number, number, number] = [x1, y1, x2, y2];
  const transition = (durationMs: number): Transition => ({
    duration: durationMs / MS_PER_SECOND,
    ease,
  });
  return {
    fast: transition(tokens.durationFastMs),
    base: transition(tokens.durationBaseMs),
    slow: transition(tokens.durationSlowMs),
    reveal: {
      hidden: { opacity: 0, y: tokens.revealOffsetPx },
      visible: { opacity: 1, y: 0, transition: transition(tokens.durationSlowMs) },
    },
    staggerSeconds: tokens.staggerMs / MS_PER_SECOND,
  };
}

/** Entrance of one animated surface, adapted to the effects actually applied. */
export interface SurfaceMotion {
  /** `MOVE` at full effects, `FADE` otherwise (reduced, off, or system reduced motion). */
  readonly mode: EntranceMode;
  /** Rise from the bottom of the screen (comparison bar); a plain fade in `FADE` mode. */
  readonly slideUp: Variants;
}

/**
 * Returns the entrance of the surfaces of feature 002: a movement at full effects, a plain fade
 * otherwise (spec Edge Cases « Effets réduits ou désactivés »).
 *
 * @returns The entrance mode and its variants.
 * @see specs/002-catalog-refresh/research.md R14
 */
export function useSurfaceMotion(): SurfaceMotion {
  const { level } = useEffectiveEffects();
  const intensity = THEME.motion[useMotionIntensity()];
  const tokens = useMotionTokens();
  const mode = level === EffectsLevel.FULL ? EntranceMode.MOVE : EntranceMode.FADE;
  const offset = mode === EntranceMode.MOVE ? { y: intensity.slideOffsetPx } : {};
  return {
    mode,
    slideUp: {
      hidden: { opacity: 0, ...offset },
      visible: { opacity: 1, y: 0, transition: tokens.base },
    },
  };
}
