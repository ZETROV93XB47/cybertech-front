/**
 * Account root: « Mes commandes » is the account home page.
 *
 * @see specs/003-account-orders/tasks.md T050
 */
import { redirect } from "next/navigation";

import { ACCOUNT_PATHS } from "@/lib/constants/routes";

/**
 * Sends the account root to « Mes commandes ».
 *
 * @returns Never: always redirects.
 */
export default function AccountPage(): never {
  redirect(ACCOUNT_PATHS.orders);
}
