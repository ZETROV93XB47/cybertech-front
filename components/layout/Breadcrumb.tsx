/**
 * Breadcrumb of the shared page header (`PageHeader`): links to the parent pages, the last step
 * being the current page.
 *
 * @see specs/002-catalog-refresh/spec.md FR-028
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { COMMON_MESSAGES } from "@/features/common/messages";

/** Style of a breadcrumb link. */
const CRUMB = "text-text-muted transition-colors duration-(--duration-fast) hover:text-text";

/** One step of the breadcrumb. */
export interface BreadcrumbStep {
  /** Target of the step; `null` for a step that is not a page. */
  readonly href: string | null;
  readonly label: string;
}

/** Props of {@link Breadcrumb}. */
export interface BreadcrumbProps {
  /** Steps from the home page to the current page (last). */
  readonly steps: readonly BreadcrumbStep[];
}

/**
 * Breadcrumb navigation.
 *
 * @param props - Steps, the last one being the current page.
 * @returns The `nav` landmark.
 */
export function Breadcrumb({ steps }: BreadcrumbProps): ReactNode {
  const last = steps.length - 1;
  return (
    <nav aria-label={COMMON_MESSAGES.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {steps.map((step, index) => (
          <li key={step.label} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight aria-hidden className="size-3.5 text-text-muted" />}
            {index === last || step.href === null ? (
              <span aria-current={index === last ? "page" : undefined} className="text-text">
                {step.label}
              </span>
            ) : (
              <Link href={step.href} className={CRUMB}>
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
