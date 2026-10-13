/**
 * Section title shared by every page section (home page blocks, catalog results, FR-028).
 */
import type { ReactNode } from "react";

/** Props of {@link SectionHeading}. */
export interface SectionHeadingProps {
  /** Id referenced by the `aria-labelledby` of the section. */
  readonly id: string;
  readonly children: ReactNode;
}

/**
 * Level-2 heading of a page section.
 *
 * @param props - Id and text.
 * @returns The heading.
 */
export function SectionHeading({ id, children }: SectionHeadingProps): ReactNode {
  return (
    <h2 id={id} className="text-2xl">
      {children}
    </h2>
  );
}
