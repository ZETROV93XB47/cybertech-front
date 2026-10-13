/**
 * Browser side of the guest cart merge: one tab only, through the Web Locks API.
 *
 * @see docs/guest-cart.md §4 (rules 1, 2 and 5)
 */
import { bffSend } from "@/lib/api/bff-client";
import { MERGE_LOCK_NAME } from "@/lib/constants/cart";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { HttpMethod } from "@/lib/enums/http-method";
import { MergeReportSchema, type MergeReport } from "@/lib/schemas/cart";

import { readGuestCart, writeGuestCart } from "./guest-storage";

import { MERGE_MESSAGES } from "./messages";

/** Toast lines summing up a merge report. */
export interface MergeSummary {
  /** Success line, when at least one line was added. */
  readonly success?: string;
  /** Warning lines (dropped lines, lines to retry). */
  readonly warnings: readonly string[];
}

/**
 * Sends the stored guest lines to the BFF and keeps only the lines to retry.
 *
 * The storage is re-read here, inside the lock: a tab that waited for another one finds an
 * empty cart and does nothing (no double add).
 *
 * @param storage - `localStorage`.
 * @returns The report, or `null` when there was nothing to merge.
 * @throws {BffError} When the merge failed; the guest cart is then kept as is.
 */
async function mergeStoredLines(storage: Storage): Promise<MergeReport | null> {
  const lines = readGuestCart(storage);
  if (lines.length === 0) {
    return null;
  }
  const report = await bffSend(BFF_ROUTES.cartMerge, HttpMethod.POST, MergeReportSchema, {
    items: lines,
  });
  writeGuestCart(storage, report.failed);
  return report;
}

/**
 * Merges the guest cart into the account cart, in a single tab at a time.
 *
 * Without the Web Locks API (very old browsers) the merge runs directly; the re-read of the
 * storage still limits the risk of a double add.
 *
 * @param storage - `localStorage`.
 * @returns The report, or `null` when another tab already merged or the cart was empty.
 * @throws {BffError} When the merge failed; the guest cart is then kept as is.
 */
export async function mergeGuestCartOnce(storage: Storage): Promise<MergeReport | null> {
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return mergeStoredLines(storage);
  }
  return navigator.locks.request(MERGE_LOCK_NAME, () => mergeStoredLines(storage));
}

/**
 * Builds the toast lines of a merge report.
 *
 * @param report - Merge report.
 * @returns The success line (if any line was added) and the warnings.
 */
export function summarizeMerge(report: MergeReport): MergeSummary {
  const added = report.merged.length + report.capped.length;
  const warnings: string[] = [];
  if (report.dropped.length > 0) {
    warnings.push(MERGE_MESSAGES.dropped(report.dropped.length));
  }
  if (report.failed.length > 0) {
    warnings.push(MERGE_MESSAGES.retryLater);
  }
  return {
    ...(added > 0 ? { success: MERGE_MESSAGES.summary(added, report.capped.length) } : {}),
    warnings,
  };
}
