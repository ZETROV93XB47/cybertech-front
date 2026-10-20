/**
 * Shell of the account area (`/account/**`): the shared page template with the account
 * navigation in a side column and the page in the main column. The session is already checked
 * by the parent private layout.
 *
 * @see specs/003-account-orders/tasks.md T050
 */
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { AccountNav } from "@/features/account/components/AccountNav";

/**
 * Account shell.
 *
 * @param props - Layout props.
 * @param props.children - Account page (header and content).
 * @returns The navigation and the page.
 */
export default function AccountAreaLayout({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  return (
    <PageShell>
      <div className="grid items-start gap-10 lg:grid-cols-12">
        <aside className="lg:sticky lg:top-24 lg:col-span-3">
          <AccountNav />
        </aside>
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-9">{children}</div>
      </div>
    </PageShell>
  );
}
