/**
 * Page template shared by the home page and the catalog: one content width, one horizontal
 * padding and one vertical rhythm (FR-028).
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Props of {@link PageShell}. */
export interface PageShellProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Centred page container.
 *
 * @param props - Page content and extra classes.
 * @returns The container, marked `data-page-shell` for the layout e2e checks.
 */
export function PageShell({ children, className }: PageShellProps): ReactNode {
  return (
    <div
      data-page-shell
      className={cn("mx-auto flex w-full max-w-site flex-col gap-12 px-6 py-10", className)}
    >
      {children}
    </div>
  );
}
