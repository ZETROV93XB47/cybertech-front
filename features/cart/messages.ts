/**
 * User-facing text of the cart (French, tutoiement) — constitution XI.
 *
 * @see specs/001-catalog-auth-cart/spec.md US4
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 */

/**
 * Picks the singular or plural form.
 *
 * @param count - Number of items.
 * @param singular - Form for 0 or 1.
 * @param plural - Form for 2 and more.
 * @returns The matching form.
 */
function plural(count: number, singular: string, plural: string): string {
  return count > 1 ? plural : singular;
}

/** Text of the cart page, the add button and the header badge. */
export const CART_MESSAGES = {
  pageTitle: "Ton panier",
  linesLabel: "Articles du panier",
  summaryTitle: "Récapitulatif",
  pageDescription: "Les articles que tu as mis de côté avant de commander.",
  badgeLabel: (count: number): string =>
    count === 0 ? "Panier vide" : `Panier, ${count} ${plural(count, "article", "articles")}`,
  addToCart: "Ajouter au panier",
  addProductToCart: (name: string): string => `Ajouter ${name} au panier`,
  inCart: (count: number): string => `Déjà ${count} dans ton panier`,
  adding: "Ajout…",
  outOfStockButton: "Indisponible",
  quantityLabel: "Quantité",
  decreaseQuantity: "Retirer une unité",
  increaseQuantity: "Ajouter une unité",
  lineQuantityLabel: (name: string): string => `Quantité de ${name}`,
  removeLine: (name: string): string => `Retirer ${name} du panier`,
  removeLineShort: "Retirer",
  unitPrice: "Prix unitaire",
  subtotal: "Sous-total",
  total: "Total",
  estimatedTotal: "Total estimé",
  estimateHint: "Les prix sont relus en direct ; le total définitif est calculé à la commande.",
  itemCount: (count: number): string => `${count} ${plural(count, "article", "articles")}`,
  clearCart: "Vider le panier",
  clearConfirmTitle: "Vider ton panier ?",
  clearConfirmBody: "Tous les articles seront retirés. Tu pourras toujours les rajouter.",
  clearConfirm: "Oui, vider",
  clearCancel: "Garder mes articles",
  emptyTitle: "Ton panier est vide",
  emptyBody: "Parcours le catalogue et ajoute ce qui te plaît : on le garde ici pour toi.",
  goToCatalog: "Voir le catalogue",
  viewCart: "Voir le panier",
  loading: "Chargement de ton panier…",
  loadError: "On n'arrive pas à charger ton panier. Réessaie dans un instant.",
  guestHint: "Connecte-toi pour retrouver ton panier sur tous tes appareils.",
  deletedProductName: "Produit retiré du catalogue",
} as const;

/** Outcome messages of the cart actions, also read by the `aria-live` regions. */
export const CART_FEEDBACK_MESSAGES = {
  added: (name: string, quantity: number): string =>
    `${name} ajouté à ton panier (${quantity} ${plural(quantity, "unité", "unités")}).`,
  addedShort: "Ajouté à ton panier.",
  quantityUpdated: (name: string | undefined, quantity: number): string =>
    `Quantité ${name ? `de ${name} ` : ""}mise à jour : ${quantity}.`,
  lineRemoved: (name: string | undefined): string =>
    `${name ?? "L'article"} a été retiré de ton panier.`,
  cleared: "Ton panier a été vidé.",
  insufficientStock: (available: number): string => `Il n'en reste que ${available}.`,
  outOfStock: "Ce produit est en rupture.",
  lineInsufficientStock: (available: number): string =>
    available === 0
      ? "Ce produit est en rupture : retire-le ou attends son retour."
      : `Il n'en reste que ${available} : baisse la quantité pour commander.`,
  productGone: "Ce produit n'existe plus.",
  lineUnavailable: "Ce produit n'est plus disponible : retire-le de ton panier.",
  removedUnavailable: (count: number): string =>
    `${count} ${plural(count, "produit a été retiré", "produits ont été retirés")} de ton panier : ${plural(count, "il n'est", "ils ne sont")} plus au catalogue.`,
  cartFull: (max: number): string =>
    `Ton panier est plein : ${max} produits différents au maximum.`,
  maxQuantity: (max: number): string => `${max} unités au maximum par produit.`,
  cartChanged: "Ton panier a changé, on l'a mis à jour.",
  conflict: "Ton panier a été modifié ailleurs, réessaie.",
  emptyCart: "Ton panier est vide.",
  sessionExpired: "Ta session a expiré, reconnecte-toi.",
  rateLimited: "Doucement ! Réessaie dans quelques secondes.",
  unavailable: "On n'arrive pas à joindre la boutique. Réessaie dans un instant.",
  unknown: "Quelque chose s'est mal passé. Réessaie.",
} as const;

/** Text of the guest cart merge at sign-in (docs/guest-cart.md §4). */
export const MERGE_MESSAGES = {
  summary: (added: number, capped: number): string => {
    const base = `${added} ${plural(added, "article ajouté", "articles ajoutés")} à ton panier`;
    return capped === 0 ? `${base}.` : `${base}, ${capped} limité(s) au stock.`;
  },
  dropped: (count: number): string =>
    `${count} ${plural(count, "article n'a pas pu être ajouté", "articles n'ont pas pu être ajoutés")} : rupture de stock ou produit retiré.`,
  retryLater:
    "On n'a pas pu récupérer tout ton panier de visiteur ; on réessaiera à ta prochaine visite.",
} as const;
