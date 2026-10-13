/**
 * Plays an interface sound according to the user's sound preference.
 *
 * @see lib/sound/ui-sounds.ts
 */
import { useCallback } from "react";

import type { UiSound } from "@/lib/enums/theme";
import { playUiSound } from "@/lib/sound/ui-sounds";

import { usePreferences } from "../PreferencesProvider";

/**
 * Returns a function playing a sound, silent unless the user turned sounds on.
 *
 * @returns `play(sound)`.
 */
export function useUiSound(): (sound: UiSound) => void {
  const setting = usePreferences().sound;
  return useCallback(
    (sound: UiSound) => {
      playUiSound(sound, setting);
    },
    [setting],
  );
}
