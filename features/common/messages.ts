/**
 * Shared user-facing text (French, tutoiement) — constitution XI: no French string is written
 * directly in a component.
 */

/** Site identity and page metadata. */
export const SITE_MESSAGES = {
  name: "cybertech",
  title: "cybertech — matériel informatique",
  description:
    "Ordinateurs et écrans sélectionnés avec soin. Compare, filtre, ajoute au panier : tout se passe ici.",
  skipToContent: "Aller au contenu",
  mainNavigation: "Navigation principale",
  homeNavLink: "Accueil",
  catalogLink: "Catalogue",
  homeLink: "Accueil de cybertech",
  footerNote: "Projet pédagogique — les commandes ne sont pas encore ouvertes.",
} as const;

/** Generic states shared by every page. */
export const COMMON_MESSAGES = {
  loading: "Chargement…",
  retry: "Réessayer",
  backHome: "Revenir à l'accueil",
  errorTitle: "La boutique ne répond pas",
  errorBody:
    "On n'arrive pas à joindre la boutique pour le moment. Réessaie dans un instant ; si ça dure, reviens un peu plus tard.",
  notFoundTitle: "Cette page n'existe pas",
  notFoundBody: "Le lien est peut-être ancien. Le catalogue, lui, est toujours là.",
  goToCatalog: "Voir le catalogue",
  /** Accessible name of the close buttons of dialogs and panels. */
  close: "Fermer",
} as const;
