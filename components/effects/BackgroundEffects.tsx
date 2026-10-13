"use client";

/**
 * Background effects of every page (aurora and dot grid), loaded on the client only: they
 * need the viewport and the cursor, and the server render stays light (LCP).
 */
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AuroraBlobs = dynamic(() => import("./AuroraBlobs").then((module) => module.AuroraBlobs), {
  ssr: false,
});
const DotGrid = dynamic(() => import("./DotGrid").then((module) => module.DotGrid), {
  ssr: false,
});

/**
 * Aurora and dot grid, behind the content.
 *
 * @returns Both background layers.
 */
export function BackgroundEffects(): ReactNode {
  return (
    <>
      <AuroraBlobs />
      <DotGrid />
    </>
  );
}
