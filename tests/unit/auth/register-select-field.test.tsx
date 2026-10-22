/**
 * Choice field of the registration form: labelled dropdown list opening like « Trier par », the
 * chosen value submitted through the form, and validation when the list closes.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SelectField } from "@/features/auth/components/RegisterFields";
import { CommunicationChannel } from "@/lib/enums/communication-channel";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { RegisterField } from "@/lib/enums/register-field";

import { renderWithProviders } from "../../helpers/providers";

/** Label of the field. */
const LABEL = "Comment préfères-tu qu'on te contacte ?";

/** Options of the field, as in the registration form. */
const OPTIONS = [
  { value: CommunicationChannel.EMAIL, label: "Par email" },
  { value: CommunicationChannel.SMS, label: "Par SMS" },
] as const;

// The Radix listbox uses pointer capture and scrolls the checked option into view: jsdom has
// neither.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

/**
 * Renders the field inside a form.
 *
 * @param props - Error, initial value and blur handler.
 * @returns The form element.
 */
function renderField(
  props: {
    readonly error?: string;
    readonly defaultValue?: string;
    readonly onBlur?: (form: HTMLFormElement | null, field: RegisterField) => void;
  } = {},
): HTMLFormElement {
  const { container } = renderWithProviders(
    <form>
      <SelectField
        name={RegisterField.FAVORITE_COMMUNICATION_CHANNEL}
        label={LABEL}
        error={props.error}
        defaultValue={props.defaultValue}
        onBlur={props.onBlur ?? vi.fn()}
        options={OPTIONS}
        placeholder="Choisis…"
      />
    </form>,
  );
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("Form not rendered");
  }
  return form;
}

/**
 * Value the form would submit for the field.
 *
 * @param form - The form element.
 * @returns The submitted value.
 */
function submitted(form: HTMLFormElement): FormDataEntryValue | null {
  return new FormData(form).get(RegisterField.FAVORITE_COMMUNICATION_CHANNEL);
}

describe("SelectField", () => {
  it("shows the placeholder and submits nothing until a choice is made", async () => {
    const form = renderField();
    expect(screen.getByRole("combobox", { name: LABEL })).toHaveTextContent("Choisis…");
    expect(submitted(form)).toBe("");
    expect(await axe(form)).toHaveNoViolations();
  });

  it("opens a list in the « Trier par » panel and submits the chosen option", async () => {
    const onBlur = vi.fn();
    const form = renderField({ onBlur });
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: LABEL }));
    const list = await screen.findByRole("listbox");
    expect(list.querySelector("[data-entrance]")).toHaveAttribute(
      "data-entrance",
      EntranceMode.MOVE,
    );
    await user.click(within(list).getByRole("option", { name: "Par SMS" }));
    expect(screen.getByRole("combobox", { name: LABEL })).toHaveTextContent("Par SMS");
    expect(submitted(form)).toBe(CommunicationChannel.SMS);
    expect(onBlur).toHaveBeenLastCalledWith(form, RegisterField.FAVORITE_COMMUNICATION_CHANNEL);
  });

  it("keeps the value refilled by the server and checks it in the list", async () => {
    const form = renderField({ defaultValue: CommunicationChannel.EMAIL });
    expect(submitted(form)).toBe(CommunicationChannel.EMAIL);
    await userEvent.setup().click(screen.getByRole("combobox", { name: LABEL }));
    const list = await screen.findByRole("listbox");
    expect(within(list).getByRole("option", { name: "Par email" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("validates when the list closes on Escape, not while it opens", async () => {
    const onBlur = vi.fn();
    renderField({ onBlur });
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: LABEL }));
    await screen.findByRole("listbox");
    expect(onBlur).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onBlur).toHaveBeenCalledOnce();
    expect(screen.getByRole("combobox", { name: LABEL })).toHaveFocus();
  });

  it("links the error to the trigger", () => {
    renderField({ error: "Choisis une option." });
    const trigger = screen.getByRole("combobox", { name: LABEL });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Choisis une option.");
  });
});
