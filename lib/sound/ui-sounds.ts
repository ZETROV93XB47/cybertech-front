/**
 * Short interface sounds generated with the Web Audio API (no audio file), played only when the
 * user turned sounds on (off by default, FR-033). Volume, pitch and length come from
 * `THEME.sound`.
 *
 * @see specs/001-catalog-auth-cart/research.md R18
 */
import { MS_PER_SECOND } from "@/lib/constants/time";
import { SoundSetting, UiSound } from "@/lib/enums/theme";
import { THEME } from "@/lib/theme/theme.config";

/** Smallest gain an exponential ramp can reach (it cannot reach zero). */
const SILENT_GAIN = 0.0001;

/** Audio context, created on the first sound (browsers require a user gesture first). */
let audioContext: AudioContext | undefined;

/**
 * Returns the shared audio context, creating it when needed.
 *
 * @returns The context, or `undefined` when Web Audio is not available.
 */
function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return undefined;
  }
  audioContext ??= new window.AudioContext();
  return audioContext;
}

/**
 * Plays one interface sound.
 *
 * @param sound - Which sound.
 * @param setting - Current sound preference; nothing happens when `OFF`.
 * @returns `true` when a sound was started.
 */
export function playUiSound(sound: UiSound, setting: SoundSetting): boolean {
  if (setting === SoundSetting.OFF) {
    return false;
  }
  try {
    return startTone(sound);
  } catch {
    // A sound is a bonus: an audio failure must never break the action that triggered it.
    return false;
  }
}

/**
 * Starts the oscillator of one sound.
 *
 * @param sound - Which sound.
 * @returns `true` when a sound was started.
 */
function startTone(sound: UiSound): boolean {
  const context = getAudioContext();
  if (!context) {
    return false;
  }
  const tone = THEME.sound.tones[sound];
  const start = context.currentTime;
  const end = start + tone.durationMs / MS_PER_SECOND;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = tone.waveform;
  oscillator.frequency.setValueAtTime(tone.frequencyHz, start);
  gain.gain.setValueAtTime(THEME.sound.volume, start);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end);
  return true;
}
