/**
 * User-facing text of the product comparator (French, tutoiement) — constitution XI.
 *
 * @see specs/002-catalog-refresh/spec.md US2
 */
import { COMPARE_MAX_PRODUCTS } from "@/lib/constants/compare";
import { CompareRefusal } from "@/lib/enums/compare-refusal";
import { UI_LOCALE } from "@/lib/format";

/** « Comparer » checkbox of the cards and button of the product page. */
export const COMPARE_TOGGLE_MESSAGES = {
  /** Visible text of the card checkbox. */
  checkbox: "Comparer",
  /**
   * Accessible name of the card checkbox: starts with the visible text (label in name).
   *
   * @param name - Product name.
   * @returns The name.
   */
  checkboxLabel: (name: string): string => `Comparer ${name}`,
  add: "Ajouter à la comparaison",
  remove: "Retirer de la comparaison",
} as const;

/** Why a product cannot join the comparison, by refusal. */
export const COMPARE_REFUSAL_MESSAGES: Readonly<Record<CompareRefusal, string>> = {
  [CompareRefusal.FULL]: `${COMPARE_MAX_PRODUCTS} produits maximum : retire un produit pour en ajouter un autre.`,
  [CompareRefusal.OTHER_CATEGORY]: "Tu ne peux comparer que des produits de la même catégorie.",
};

/** Comparison bar at the bottom of the catalog and of the product page. */
export const COMPARE_BAR_MESSAGES = {
  label: "Comparaison",
  listLabel: "Produits à comparer",
  invitation: "Choisis un autre produit à comparer.",
  count: (count: number): string =>
    count === 1 ? "1 produit à comparer" : `${count.toLocaleString(UI_LOCALE)} produits à comparer`,
  empty: "Comparaison vidée.",
  compare: "Comparer",
  clear: "Tout effacer",
  remove: (name: string): string => `Retirer ${name} de la comparaison`,
  /** Name used while the card of a selected product is loading. */
  loadingProduct: "Produit en cours de chargement",
} as const;

/** Comparison modal. */
export const COMPARE_DIALOG_MESSAGES = {
  title: "Comparer les produits",
  description: "Les caractéristiques des produits choisis, ligne par ligne.",
  differencesOnly: "Afficher seulement les différences",
  noDifference: "Aucune différence entre ces produits.",
  differs: "valeurs différentes",
  characteristic: "Caractéristique",
  missingValue: "—",
  loading: "Chargement de la comparaison…",
  error: "La comparaison ne se charge pas. Réessaie dans un instant.",
  removedProduct: "Un produit de ta comparaison n'est plus disponible, on l'a retiré.",
} as const;
