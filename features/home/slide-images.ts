/**
 * Photo of each category for the home carousel (US3), served by the site (static imports:
 * `next/image` knows their size and blur placeholder, no third-party origin).
 *
 * @see specs/004-catalog-promos-reviews/research.md R5
 * @see docs/credits.md
 */
import type { StaticImageData } from "next/image";

import { CategoryKey } from "@/lib/enums/category-key";
import computer from "@/public/images/categories/computer.jpg";
import desktop from "@/public/images/categories/desktop.jpg";
import monitor from "@/public/images/categories/monitor.jpg";
import smartphone from "@/public/images/categories/smartphone.jpg";
import smartwatch from "@/public/images/categories/smartwatch.jpg";

/** Photo of each category. */
export const CATEGORY_IMAGES: Readonly<Record<CategoryKey, StaticImageData>> = {
  [CategoryKey.COMPUTER]: computer,
  [CategoryKey.DESKTOP]: desktop,
  [CategoryKey.MONITOR]: monitor,
  [CategoryKey.SMARTPHONE]: smartphone,
  [CategoryKey.SMARTWATCH]: smartwatch,
};
