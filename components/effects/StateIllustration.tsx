/**
 * Illustration of the empty and error states (spec annex « États vides et erreurs »): a small
 * aurora ring around an icon that names the situation, floating gently. The float is a CSS
 * animation, frozen when the system asks for reduced motion. Colours come from the theme
 * variables, so the ring follows the chosen accent.
 */
import type { ReactNode } from "react";

/** Props of {@link StateIllustration}. */
export interface StateIllustrationProps {
  /** Icon in the centre (e.g. an empty bag, a broken link), sized `size-10`. Decorative. */
  readonly icon: ReactNode;
}

/**
 * Decorative illustration.
 *
 * @param props - Central icon.
 * @returns The illustration, hidden from assistive technologies.
 */
export function StateIllustration({ icon }: StateIllustrationProps): ReactNode {
  return (
    <div aria-hidden className="illustration-float relative grid size-32 place-items-center">
      <svg viewBox="0 0 128 128" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id="state-glow">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="state-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-color)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r="60" fill="url(#state-glow)" />
        <circle
          cx="64"
          cy="64"
          r="44"
          fill="none"
          stroke="url(#state-ring)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <circle cx="108" cy="64" r="3" fill="var(--gold)" />
        <circle cx="26" cy="38" r="2" fill="var(--accent-color)" />
      </svg>
      <span className="relative text-text-muted">{icon}</span>
    </div>
  );
}
