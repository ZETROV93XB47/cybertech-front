/**
 * User-facing text of the promotions pages (French, tutoiement) — constitution XI.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4
 */
import { CampaignImageKey } from "@/lib/enums/promotions";

/** « Promotions » list page. */
export const PROMOTIONS_MESSAGES = {
  navLink: "Promotions",
  title: "Promotions",
  subtitle:
    "Les réductions en cours sur toute la boutique. Choisis-en une : elle sera déjà sélectionnée dans ton panier.",
  listLabel: "Campagnes en cours",
  emptyTitle: "Aucune promotion en ce moment",
  emptyBody:
    "Reviens bientôt : les prochaines campagnes apparaîtront ici. En attendant, le catalogue t'attend.",
  browseCatalog: "Parcourir le catalogue",
  seeCampaign: "Voir l'offre",
  metaDescription: "Les promotions en cours chez cybertech, à appliquer à ton panier en un clic.",
} as const;

/** Page of one campaign. */
export const CAMPAIGN_MESSAGES = {
  conditionsTitle: "Conditions",
  noEndDate: "Sans date de fin",
  hint: "La remise exacte est calculée sur ton panier, au moment de la commande.",
  apply: "Appliquer à mon panier",
  applying: "On sélectionne la réduction…",
  seeCatalog: "Voir le catalogue",
  goToCart: "Voir mon panier",
  signIn: "Me connecter",
  applied: (name: string): string =>
    `${name} est sélectionnée : tu la retrouveras dans ton panier.`,
  signInNeeded: (name: string): string =>
    `${name} est gardée pour toi. Connecte-toi pour en profiter : les réductions demandent un compte.`,
  storageUnavailable:
    "Ton navigateur bloque l'enregistrement de la réduction. Saisis sa clé directement dans ton panier.",
  keyLabel: (key: string): string => `Clé : ${key}`,
  notFoundTitle: "Campagne introuvable ou terminée",
  notFoundBody:
    "Cette promotion n'existe pas ou n'est plus active. D'autres t'attendent peut-être.",
  backToPromotions: "Voir les promotions en cours",
} as const;

/** Breadcrumb of the promotions pages. */
export const PROMOTIONS_BREADCRUMB_MESSAGES = {
  home: "Accueil",
  promotions: "Promotions",
} as const;

/** Display name of the campaigns the backend knows (`DiscountTypeResolver`). */
export const CAMPAIGN_NAMES: Readonly<Record<CampaignImageKey, string>> = {
  [CampaignImageKey.BLACK_FRIDAY]: "Black Friday",
  [CampaignImageKey.WINTER_SALES]: "Soldes d'hiver",
  [CampaignImageKey.SPRING_SALES]: "Soldes de printemps",
  [CampaignImageKey.BUY_ONE_GET_ONE_FREE]: "Un acheté, un offert",
};

/** Text alternative of each campaign photo. */
export const CAMPAIGN_IMAGE_ALTS: Readonly<Record<CampaignImageKey, string>> = {
  [CampaignImageKey.BLACK_FRIDAY]:
    "Deux paquets cadeaux, l'un noir et l'autre marbré, noués de rubans cuivrés",
  [CampaignImageKey.WINTER_SALES]: "Chalet en bois au pied d'une colline enneigée",
  [CampaignImageKey.SPRING_SALES]: "Branche de cerisier en fleurs sur un ciel bleu",
  [CampaignImageKey.BUY_ONE_GET_ONE_FREE]:
    "Un paquet vert posé sur un colis en papier kraft, noués de ficelle",
};

/** Text alternative of the generic campaign photo. */
export const GENERIC_CAMPAIGN_IMAGE_ALT = "Sac cadeau rose à motifs sur fond noir";
