import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { SearchX } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import {
  ProductCardSkeleton,
  ProductGridSkeleton,
} from "@/features/catalog/components/ProductCardSkeleton";

import { renderWithProviders } from "../../helpers/providers";

describe("PageHeader", () => {
  it("renders one h1, the subtitle, the actions and the live slot, without breadcrumb", async () => {
    const { container } = render(
      <PageShell>
        <PageHeader
          title={<h1>Catalogue</h1>}
          subtitle="Tout le matériel"
          actions={<a href="/products">Parcourir</a>}
          live="531 produits"
        />
      </PageShell>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Tout le matériel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Parcourir" })).toBeInTheDocument();
    expect(screen.getByText("531 produits")).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the breadcrumb above the title when given", () => {
    render(
      <PageHeader
        breadcrumb={
          <nav aria-label="Fil d'Ariane">
            <a href="/">Accueil</a>
          </nav>
        }
        title={<h1>Catalogue</h1>}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument();
  });
});

describe("SectionHeading", () => {
  it("renders an h2 with the id used by aria-labelledby", async () => {
    const { container } = render(
      <section aria-labelledby="best">
        <SectionHeading id="best">Les plus demandés</SectionHeading>
      </section>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Les plus demandés" })).toHaveAttribute(
      "id",
      "best",
    );
    expect(screen.getByRole("region", { name: "Les plus demandés" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EmptyState", () => {
  it("shows the illustration, the sentence and the action link", async () => {
    const { container } = renderWithProviders(
      <EmptyState
        icon={<SearchX />}
        title="Rien ici"
        body="Parcours le catalogue."
        action={{ href: "/products", label: "Voir le catalogue" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Rien ici" })).toBeInTheDocument();
    expect(screen.getByText("Parcours le catalogue.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le catalogue" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no action link when none is given", () => {
    render(<EmptyState icon={<SearchX />} title="Rien ici" body="Plus tard." />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("ProductCardSkeleton", () => {
  it("is hidden from assistive technologies and shimmers", () => {
    const { container } = render(<ProductCardSkeleton />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".skeleton-shimmer")).not.toBeNull();
  });

  it("renders n cards in the product grid", () => {
    const { container } = render(<ProductGridSkeleton count={4} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toHaveClass("grid");
    expect(within(grid).queryAllByRole("listitem")).toHaveLength(0);
    expect(grid.children).toHaveLength(4);
  });
});
