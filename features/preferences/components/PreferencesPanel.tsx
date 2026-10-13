"use client";

/**
 * « Préférences » panel (US5): effects level, motion intensity, accent colour and sounds, plus a
 * reset button. Only predefined options are offered (FR-035); every change applies at once and
 * is kept in the cookie (FR-034). When the system asks for reduced motion, a notice says that it
 * wins over the effects preference (FR-036).
 *
 * @see specs/001-catalog-auth-cart/spec.md US5
 */
import { SlidersHorizontal, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { AccentVariant, EffectsLevel, MotionIntensity, SoundSetting } from "@/lib/enums/theme";
import { THEME } from "@/lib/theme/theme.config";

import { ACCENT_LABELS, EFFECTS_LABELS, MOTION_LABELS, PREFERENCES_MESSAGES } from "../messages";
import { usePreferences, useSystemReducedMotion } from "../PreferencesProvider";

/** One option of a choice group. */
interface ChoiceOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  /** Colour swatch shown next to the label (accents). */
  readonly swatch?: string;
}

/** Props of {@link ChoiceGroup}. */
interface ChoiceGroupProps<TValue extends string> {
  readonly legend: string;
  readonly hint?: string;
  readonly value: TValue;
  readonly options: readonly ChoiceOption<TValue>[];
  readonly onChange: (value: TValue) => void;
}

/**
 * Labelled radio group (keyboard: arrows move and select, the state is announced).
 *
 * @param props - Legend, current value, options and change handler.
 * @returns The group.
 */
function ChoiceGroup<TValue extends string>(props: ChoiceGroupProps<TValue>): ReactNode {
  const id = useId();
  const options = new Map(props.options.map((option) => [option.value as string, option]));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend id={`${id}-legend`} className="mb-1 text-sm font-medium">
        {props.legend}
      </legend>
      {props.hint && <p className="text-xs text-text-muted">{props.hint}</p>}
      <RadioGroup
        aria-labelledby={`${id}-legend`}
        value={props.value}
        onValueChange={(next) => {
          const option = options.get(next);
          if (option) {
            props.onChange(option.value);
          }
        }}
        className="flex flex-wrap gap-4"
      >
        {props.options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${id}-${option.value}`} value={option.value} />
            <Label htmlFor={`${id}-${option.value}`} className="font-normal">
              {option.swatch && (
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: option.swatch }}
                />
              )}
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/** Options of each group, built once from the enums and the theme. */
const EFFECTS_OPTIONS = Object.values(EffectsLevel).map((value) => ({
  value,
  label: EFFECTS_LABELS[value],
}));
const MOTION_OPTIONS = Object.values(MotionIntensity).map((value) => ({
  value,
  label: MOTION_LABELS[value],
}));
const ACCENT_OPTIONS = Object.values(AccentVariant).map((value) => ({
  value,
  label: ACCENT_LABELS[value],
  swatch: THEME.accents[value].accent,
}));

/**
 * Content of the panel.
 *
 * @returns The settings and the reset button.
 */
function PreferencesSettings(): ReactNode {
  const preferences = usePreferences();
  const systemReducedMotion = useSystemReducedMotion();
  const soundId = useId();
  return (
    <div className="flex flex-col gap-8 px-4 pb-6">
      {systemReducedMotion && (
        <p role="note" className="rounded-field border border-border p-3 text-sm text-text">
          {PREFERENCES_MESSAGES.reducedMotionNotice}
        </p>
      )}
      <ChoiceGroup
        legend={PREFERENCES_MESSAGES.effectsLegend}
        hint={PREFERENCES_MESSAGES.effectsHint}
        value={preferences.effects}
        options={EFFECTS_OPTIONS}
        onChange={(effects) => {
          preferences.update({ effects });
        }}
      />
      <ChoiceGroup
        legend={PREFERENCES_MESSAGES.motionLegend}
        value={preferences.motion}
        options={MOTION_OPTIONS}
        onChange={(motion) => {
          preferences.update({ motion });
        }}
      />
      <ChoiceGroup
        legend={PREFERENCES_MESSAGES.accentLegend}
        hint={PREFERENCES_MESSAGES.accentHint}
        value={preferences.accent}
        options={ACCENT_OPTIONS}
        onChange={(accent) => {
          preferences.update({ accent });
        }}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={soundId}>{PREFERENCES_MESSAGES.soundLabel}</Label>
          <p className="text-xs text-text-muted">{PREFERENCES_MESSAGES.soundHint}</p>
        </div>
        <Switch
          id={soundId}
          checked={preferences.sound === SoundSetting.ON}
          onCheckedChange={(checked) => {
            preferences.update({ sound: checked ? SoundSetting.ON : SoundSetting.OFF });
          }}
        />
      </div>
      <button
        type="button"
        onClick={preferences.reset}
        className="inline-flex h-10 items-center justify-center self-start rounded-button border border-border px-4 text-sm transition-colors duration-(--duration-fast) hover:border-brand-text"
      >
        {PREFERENCES_MESSAGES.reset}
      </button>
    </div>
  );
}

/**
 * Header button opening the « Préférences » panel.
 *
 * @returns The trigger and its side panel.
 */
export function PreferencesPanel(): ReactNode {
  return (
    <Sheet>
      <SheetTrigger
        aria-label={PREFERENCES_MESSAGES.trigger}
        className="inline-flex size-10 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-text"
      >
        <SlidersHorizontal aria-hidden className="size-5" />
      </SheetTrigger>
      <SheetContent showCloseButton={false} className="overflow-y-auto border-border bg-surface">
        <SheetClose
          aria-label={PREFERENCES_MESSAGES.close}
          className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-button text-text-muted hover:text-text"
        >
          <X aria-hidden className="size-4" />
        </SheetClose>
        <SheetHeader>
          <SheetTitle>{PREFERENCES_MESSAGES.title}</SheetTitle>
          <SheetDescription>{PREFERENCES_MESSAGES.description}</SheetDescription>
        </SheetHeader>
        <PreferencesSettings />
      </SheetContent>
    </Sheet>
  );
}
