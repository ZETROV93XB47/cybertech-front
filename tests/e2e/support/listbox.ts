/**
 * Helpers for the site dropdown lists (Radix `Select`, see `components/dropdown/ListboxSelect.tsx`):
 * they are not native selects, so Playwright's `selectOption` does not apply.
 */
import { expect, type Locator, type Page } from "@playwright/test";

/** Option to choose: its visible text, or its position in the list (0 = first option). */
export type ListOption = string | { readonly index: number };

/**
 * Opens a dropdown list and chooses one option.
 *
 * @param page - Page holding the list (the options are rendered in a portal).
 * @param scope - Region or form containing the trigger.
 * @param label - Accessible name of the trigger (its field label).
 * @param option - Text or position of the option.
 */
export async function chooseListOption(
  page: Page,
  scope: Locator,
  label: string,
  option: ListOption,
): Promise<void> {
  await scope.getByRole("combobox", { name: label }).click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const target =
    typeof option === "string"
      ? list.getByRole("option", { name: option, exact: true })
      : list.getByRole("option").nth(option.index);
  await target.click();
  await expect(list).toBeHidden();
}
