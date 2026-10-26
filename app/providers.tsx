"use client";

/**
 * Client-side providers mounted once by the root layout: server state (TanStack Query),
 * session (Auth.js), motion preferences, interface preferences, toasts and the push subscription
 * sync (feature 005).
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";

import { ClientEffects } from "@/components/effects/ClientEffects";
import { Toaster } from "@/components/ui/sonner";
import { PushSync } from "@/features/notifications/components/PushSync";
import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { createQueryClient } from "@/lib/query/query-client";
import type { Preferences } from "@/lib/schemas/preferences";

/** Props of {@link Providers}. */
export interface ProvidersProps {
  /** Interface preferences read on the server from the cookie. */
  readonly preferences: Preferences;
  readonly children: ReactNode;
}

/**
 * Wraps the application with every client provider.
 *
 * The query client is created once per browser tab (lazy `useState` initialiser), never shared
 * between users on the server.
 *
 * @param props - Server-read preferences and the page.
 * @returns The provider tree.
 */
export function Providers({ preferences, children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(createQueryClient);
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider initialPreferences={preferences}>
          <MotionConfig reducedMotion="user">
            <ClientEffects />
            <PushSync />
            {children}
            <Toaster />
          </MotionConfig>
        </PreferencesProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
