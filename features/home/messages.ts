/**
 * User-facing text of the home carousel (French, tutoiement) — constitution XI.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US3
 * @see specs/004-catalog-promos-reviews/research.md R4
 */
import { CategoryKey } from "@/lib/enums/category-key";
import { UI_LOCALE } from "@/lib/format";

/** Carousel controls and accessible names (WAI-ARIA carousel pattern). */
export const CAROUSEL_MESSAGES = {
  name: "À la une",
  roleDescription: "carrousel",
  slideRoleDescription: "diapositive",
  slidePosition: (position: number, total: number): string => `${position} sur ${total}`,
  pause: "Mettre en pause le défilement",
  play: "Lancer le défilement",
  previous: "Diapositive précédente",
  next: "Diapositive suivante",
  dotsLabel: "Choisir une diapositive",
  goTo: (position: number): string => `Aller à la diapositive ${position}`,
  categoryKicker: "Catégorie",
  campaignKicker: "Promotion",
  productCount: (count: number): string =>
    count === 1 ? "1 produit" : `${count.toLocaleString(UI_LOCALE)} produits`,
  campaignCta: "Voir la promotion",
  campaignTitle: (benefit: string): string => `${benefit} sur ta commande`,
} as const;

/** One-line pitch of each category slide. */
export const CATEGORY_TAGLINES: Readonly<Record<CategoryKey, string>> = {
  [CategoryKey.COMPUTER]: "Légers, endurants, prêts à te suivre partout.",
  [CategoryKey.DESKTOP]: "La puissance d'une tour pour créer, coder et jouer.",
  [CategoryKey.MONITOR]: "Plus de place, plus de détails, moins de fatigue.",
  [CategoryKey.SMARTPHONE]: "Les derniers modèles, comparés pour toi.",
  [CategoryKey.SMARTWATCH]: "Ta santé, tes notifications et ton sport au poignet.",
};

/** Call to action of each category slide. */
export const CATEGORY_CTAS: Readonly<Record<CategoryKey, string>> = {
  [CategoryKey.COMPUTER]: "Voir les ordinateurs portables",
  [CategoryKey.DESKTOP]: "Voir les ordinateurs de bureau",
  [CategoryKey.MONITOR]: "Voir les écrans",
  [CategoryKey.SMARTPHONE]: "Voir les smartphones",
  [CategoryKey.SMARTWATCH]: "Voir les montres connectées",
};

/** Text alternative of each category photo. */
export const CATEGORY_IMAGE_ALTS: Readonly<Record<CategoryKey, string>> = {
  [CategoryKey.COMPUTER]: "Ordinateur portable entrouvert, son écran éclairant une table sombre",
  [CategoryKey.DESKTOP]: "Poste de travail avec écran, clavier rétroéclairé, souris et tour vitrée",
  [CategoryKey.MONITOR]: "Deux écrans côte à côte, l'un affichant du code, l'autre un paysage",
  [CategoryKey.SMARTPHONE]: "Mains tenant un smartphone devant un bureau",
  [CategoryKey.SMARTWATCH]: "Montre connectée au poignet, cadran allumé",
};
