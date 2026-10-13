"use client";

/**
 * Error boundary of every page: friendly message and « Réessayer », never a blank page (FR-029).
 * The animated illustration is added in phase 8 (T113).
 */
import { CloudOff } from "lucide-react";

import { useEffect, type ReactNode } from "react";

import { StateIllustration } from "@/components/effects/StateIllustration";
import { Button } from "@/components/ui/button";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { clientLogger } from "@/lib/client-logger";

/** Props passed by Next.js to an error boundary. */
export interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

/**
 * Error page.
 *
 * @param props - The error and the function that re-renders the segment.
 * @returns The error message with a retry button.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps): ReactNode {
  useEffect(() => {
    clientLogger.error("Page rendering failed", { digest: error.digest });
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-site flex-col items-start gap-4 px-6 py-24">
      <StateIllustration icon={<CloudOff className="size-10" />} />
      <h1 className="text-3xl">{COMMON_MESSAGES.errorTitle}</h1>
      <p className="max-w-prose text-text-muted">{COMMON_MESSAGES.errorBody}</p>
      <Button onClick={reset}>{COMMON_MESSAGES.retry}</Button>
    </section>
  );
}
