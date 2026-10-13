/**
 * Loading state of every page: skeletons with the accent shimmer (static when motion is reduced).
 */
import type { ReactNode } from "react";

import { COMMON_MESSAGES } from "@/features/common/messages";

/** Number of skeleton cards shown while a page loads. */
const SKELETON_COUNT = 6;

/**
 * Loading page.
 *
 * @returns A grid of skeleton cards announced as busy to assistive technologies.
 */
export default function Loading(): ReactNode {
  return (
    <section
      aria-busy="true"
      aria-label={COMMON_MESSAGES.loading}
      className="mx-auto grid w-full max-w-site grid-cols-1 gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} className="skeleton-shimmer aspect-4/3 rounded-card" />
      ))}
    </section>
  );
}
