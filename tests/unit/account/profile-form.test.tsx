/**
 * « Mon profil » components with jest-axe (feature 003 US4, T056): prefilled form, read-only
 * identity, client validation, phone never shown back, confirmation and session expiry.
 *
 * @see specs/003-account-orders/spec.md US4, FR-028, FR-029
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "@/features/account/components/ProfileForm";
import { ProfileIdentity } from "@/features/account/components/ProfileIdentity";
import type { ProfileActionState } from "@/features/account/profile-state";
import type { ProfileView } from "@/features/account/profile-view";
import { ProfileStatus } from "@/lib/enums/profile";

const action = vi.hoisted(() => ({
  updateProfile:
    vi.fn<(previous: ProfileActionState, data: FormData) => Promise<ProfileActionState>>(),
}));
vi.mock("@/features/account/actions", () => action);

const CONSOLE_URL = "http://localhost:8080/realms/cybertech/account";

const VIEW: ProfileView = {
  firstName: "Camille",
  lastName: "Testeur",
  email: "camille@example.com",
  username: "camille.testeur",
  address: { street: "12 rue de la Paix", zipCode: "75002", city: "Paris", country: "France" },
  addressLine: "12 rue de la Paix, 75002 Paris, France",
};

beforeEach(() => {
  action.updateProfile.mockReset();
});

describe("ProfileIdentity", () => {
  it("shows email and user name read-only, the console link in a new tab, no deletion", async () => {
    const { container } = render(<ProfileIdentity view={VIEW} consoleUrl={CONSOLE_URL} />);
    expect(screen.getByText("camille@example.com")).toBeInTheDocument();
    expect(screen.getByText("camille.testeur")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Changer de mot de passe \(nouvel onglet\)/ });
    expect(link).toHaveAttribute("href", CONSOLE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText(/supprimer/i)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ProfileForm", () => {
  it("is prefilled from the split address, with an empty phone and its notice", async () => {
    const { container } = render(<ProfileForm view={VIEW} />);
    expect(screen.getByLabelText("Prénom")).toHaveValue("Camille");
    expect(screen.getByLabelText("Ville")).toHaveValue("Paris");
    expect(screen.getByLabelText("Code postal")).toHaveValue("75002");
    const phone = screen.getByLabelText("Téléphone");
    expect(phone).toHaveValue("");
    expect(phone).toHaveAccessibleDescription(/remplacera l'ancien/);
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("refuses a one-letter first name with a linked error and sends nothing", async () => {
    const user = userEvent.setup();
    render(<ProfileForm view={VIEW} />);
    const firstName = screen.getByLabelText("Prénom");
    await user.clear(firstName);
    await user.type(firstName, "C");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(firstName).toHaveAccessibleDescription("Entre 2 et 50 caractères.");
    expect(firstName).toHaveFocus();
    expect(action.updateProfile).not.toHaveBeenCalled();
  });

  it("announces the confirmation and empties the phone after a save", async () => {
    action.updateProfile.mockResolvedValue({
      status: ProfileStatus.SUCCESS,
      fieldErrors: {},
      values: { firstName: "Camille", lastName: "Testeur", city: "Lyon" },
      saveCount: 1,
    });
    const user = userEvent.setup();
    render(<ProfileForm view={VIEW} />);
    await user.type(screen.getByLabelText("Téléphone"), "+33 6 12 34 56 78");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("ton profil est à jour");
    });
    expect(screen.getByLabelText("Téléphone")).toHaveValue("");
    expect(screen.getByLabelText("Ville")).toHaveValue("Lyon");
  });

  it("keeps the typed values and offers to sign in again when the session expired", async () => {
    action.updateProfile.mockResolvedValue({
      status: ProfileStatus.ERROR,
      fieldErrors: {},
      values: { firstName: "Camille", lastName: "Testeur", city: "Marseille" },
      formError: "Ta session a expiré : reconnecte-toi, tes saisies sont conservées ici.",
      needsSignIn: true,
      saveCount: 0,
    });
    const user = userEvent.setup();
    render(<ProfileForm view={VIEW} />);
    const city = screen.getByLabelText("Ville");
    await user.clear(city);
    await user.type(city, "Marseille");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Ta session a expiré");
    });
    expect(screen.getByRole("link", { name: "Me reconnecter" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Faccount%2Fprofile",
    );
    expect(screen.getByLabelText("Ville")).toHaveValue("Marseille");
  });
});
