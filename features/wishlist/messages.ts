/**
 * User-facing text of the wishlist (French, tutoiement) — constitution XI.
 *
 * @see specs/003-account-orders/spec.md US6
 */

/** Heart button, toasts and the « Ma wishlist » page. */
export const WISHLIST_MESSAGES = {
  pageTitle: "Ma wishlist",
  metaTitle: "Ma wishlist — cybertech",
  pageDescription: "Les produits que tu as mis de côté, du plus récent au plus ancien.",
  breadcrumb: "Ma wishlist",
  add: (name: string): string => `Ajouter ${name} à ma wishlist`,
  remove: (name: string): string => `Retirer ${name} de ma wishlist`,
  detailAdd: "Ajouter à ma wishlist",
  detailRemove: "Retirer de ma wishlist",
  added: (name: string): string => `${name} est dans ta wishlist.`,
  removed: (name: string): string => `${name} a quitté ta wishlist.`,
  signInToAdd: "Connecte-toi pour garder ce produit dans ta wishlist.",
  pendingReplayed: "Le produit que tu voulais garder est dans ta wishlist.",
  pendingFailed: "On n'a pas pu ajouter le produit à ta wishlist. Réessaie depuis sa fiche.",
  unavailable: "La wishlist ne répond pas. Réessaie dans un instant.",
  rateLimited: "Trop de clics d'un coup : réessaie dans un instant.",
  productGone: "Ce produit n'existe plus.",
  failed: "Ta wishlist n'a pas changé. Réessaie dans un instant.",
  listLabel: "Produits de ma wishlist",
  addedOn: (day: string): string => `Ajouté le ${day}`,
  removeButton: "Retirer",
  removeLabel: (name: string): string => `Retirer ${name} de ma wishlist`,
  emptyTitle: "Ta wishlist est vide",
  emptyBody:
    "Clique sur le cœur d'un produit pour le mettre de côté et le retrouver ici quand tu veux.",
  goToCatalog: "Parcourir le catalogue",
  paginationLabel: "Pages de ma wishlist",
  previousPage: "Page précédente",
  nextPage: "Page suivante",
  pageStatus: (page: number, total: number): string => `Page ${page} sur ${total}`,
  loadError: "On n'arrive pas à charger ta wishlist. Réessaie dans un instant.",
} as const;
