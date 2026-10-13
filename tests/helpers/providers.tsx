/**
 * Renders a component inside the client providers of the app that the effect-aware components
 * read: TanStack Query and the preferences (effects level, motion), with `matchMedia` stubbed.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";

import { installMatchMedia } from "./match-media";

/** Options of {@link renderWithProviders}. */
export interface ProviderOptions {
  /** Effects level chosen by the user (full by default). */
  readonly effects?: EffectsLevel;
  /** Whether the system asks for reduced motion. */
  readonly reducedMotion?: boolean;
}

/**
 * Wraps a tree in the providers.
 *
 * @param ui - Tree to render.
 * @param options - Effects level and system setting.
 * @returns The wrapped tree and its fresh query client.
 */
export function withProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
): { element: ReactElement; queryClient: QueryClient } {
  installMatchMedia(options.reducedMotion ?? false);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const element = (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider
        initialPreferences={{
          ...DEFAULT_PREFERENCES,
          effects: options.effects ?? EffectsLevel.FULL,
        }}
      >
        {ui}
      </PreferencesProvider>
    </QueryClientProvider>
  );
  return { element, queryClient };
}

/**
 * Renders a tree inside the providers.
 *
 * @param ui - Tree to render.
 * @param options - Effects level and system setting.
 * @returns The render result and the query client.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { element, queryClient } = withProviders(ui, options);
  return { ...render(element), queryClient };
}
