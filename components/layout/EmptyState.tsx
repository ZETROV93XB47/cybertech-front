/**
 * Illustrated empty state shared by the catalog and the home page (FR-028): an illustration, a
 * sentence and, when there is a way out, one action link.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { MagneticButton } from "@/components/effects/MagneticButton";
import { StateIllustration } from "@/components/effects/StateIllustration";

import { PRIMARY_CTA_CLASS } from "./cta";

/** Props of {@link EmptyState}. */
export interface EmptyStateProps {
  /** Icon of the illustration. */
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
  /** Way out, e.g. « Réinitialiser les filtres ». */
  readonly action?: { readonly href: string; readonly label: string } | undefined;
}

/**
 * Empty state block.
 *
 * @param props - Illustration, texts and optional action.
 * @returns The block.
 */
export function EmptyState({ icon, title, body, action }: EmptyStateProps): ReactNode {
  return (
    <div className="glass flex flex-col items-start gap-4 rounded-card p-8">
      <StateIllustration icon={icon} />
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-prose text-text-muted">{body}</p>
      {action && (
        <MagneticButton>
          <Link href={action.href} className={PRIMARY_CTA_CLASS}>
            {action.label}
          </Link>
        </MagneticButton>
      )}
    </div>
  );
}
