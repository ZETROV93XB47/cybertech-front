/**
 * Generates the notification icons of the service worker from `public/icons/notification.svg`
 * (feature 005, research R11). Run once after a change of the SVG and commit the PNG files:
 *
 *   node scripts/generate-notification-icons.mjs
 *
 * - `notification-192.png`: colour icon shown in the notification;
 * - `notification-badge-96.png`: white silhouette on transparent, for the status bars that only
 *   draw the alpha channel (Android, ChromeOS).
 *
 * `sharp` comes with Next.js; no dependency is added.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/** Folder of the icons. */
const ICONS_DIR = join(import.meta.dirname, "..", "public", "icons");

/** Size of the colour icon, in pixels. */
const ICON_SIZE = 192;

/** Size of the monochrome badge, in pixels. */
const BADGE_SIZE = 96;

/** Badge: the « c » arc and the dot only, in white, on a transparent background. */
const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <path d="M128 66 A44 44 0 1 0 128 126" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round"/>
  <circle cx="136" cy="96" r="14" fill="#FFFFFF"/>
</svg>`;

const source = await readFile(join(ICONS_DIR, "notification.svg"));
await sharp(source).resize(ICON_SIZE, ICON_SIZE).png().toFile(join(ICONS_DIR, "notification-192.png"));
await sharp(Buffer.from(BADGE_SVG))
  .resize(BADGE_SIZE, BADGE_SIZE)
  .png()
  .toFile(join(ICONS_DIR, "notification-badge-96.png"));
