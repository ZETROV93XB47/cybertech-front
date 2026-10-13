/**
 * Root layout: fonts, theme variables, preference attributes, providers and page landmarks.
 *
 * The theme stylesheet (`buildThemeCss(THEME)`) and the `data-accent` / `data-effects` /
 * `data-motion` attributes are rendered on the server from the preferences cookie, so the first
 * paint already has the right look (FR-034).
 */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/SkipLink";
import { CommandPalette } from "@/features/catalog/components/CommandPalette";
import { SITE_MESSAGES } from "@/features/common/messages";
import { NONCE_HEADER } from "@/lib/constants/security";
import { getEnv } from "@/lib/env";
import { ThemeDataAttribute } from "@/lib/enums/theme";
import { readPreferences } from "@/lib/preferences/read-preferences";
import { buildThemeCss } from "@/lib/theme/css-variables";
import { THEME } from "@/lib/theme/theme.config";

import { Providers } from "./providers";
import "@/styles/globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/** Theme stylesheet, computed once per server process (the configuration is static). */
const THEME_CSS = buildThemeCss(THEME);

/**
 * Page metadata shared by every page.
 *
 * @returns The default metadata.
 */
export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
    title: { default: SITE_MESSAGES.title, template: `%s — ${SITE_MESSAGES.name}` },
    description: SITE_MESSAGES.description,
  };
}

/**
 * Root layout of every page.
 *
 * @param props - The page.
 * @returns The HTML document.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  const preferences = readPreferences(await cookies());
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  const preferenceAttributes = {
    [ThemeDataAttribute.ACCENT]: preferences.accent,
    [ThemeDataAttribute.EFFECTS]: preferences.effects,
    [ThemeDataAttribute.MOTION]: preferences.motion,
  };
  return (
    <html
      lang="fr"
      {...preferenceAttributes}
      className={`${sora.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers preferences={preferences}>
          <SkipLink />
          <Header search={<CommandPalette />} />
          <main id={MAIN_CONTENT_ID} className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
