/**
 * User-facing text of « Mes avis » and of the review form (French, tutoiement) — constitution XI.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5, FR-015 to FR-019
 */
import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants/reviews";
import { UI_LOCALE } from "@/lib/format";

/** Longest comment, written the French way (« 1 000 »). */
const MAX_LENGTH_TEXT = REVIEW_COMMENT_MAX_LENGTH.toLocaleString(UI_LOCALE);

/** « Mes avis » page. */
export const MY_REVIEWS_MESSAGES = {
  pageTitle: "Mes avis",
  metaTitle: "Mes avis — cybertech",
  pageDescription: "Note les produits que tu as achetés et retrouve les avis que tu as publiés.",
  breadcrumb: "Mes avis",
  toReviewTitle: "À noter",
  toReviewLabel: "Produits à noter",
  orderedOn: (day: string): string => `Commandé le ${day}`,
  publishedTitle: "Mes avis publiés",
  publishedLabel: "Avis publiés",
  postedOn: (day: string): string => `Publié le ${day}`,
  editedOn: (day: string): string => `modifié le ${day}`,
  seeProduct: "Voir le produit",
  review: "Donner mon avis",
  cancel: "Annuler",
  edit: "Modifier",
  delete: "Supprimer",
  editLabel: (product: string): string => `Modifier ton avis sur ${product}`,
  deleteLabel: (product: string): string => `Supprimer ton avis sur ${product}`,
  reviewLabel: (product: string): string => `Donner ton avis sur ${product}`,
  emptyTitle: "Rien à noter pour l'instant",
  emptyBody:
    "Une fois une commande payée, tu pourras noter ses produits ici et aider les autres clients à choisir.",
  goToCatalog: "Parcourir le catalogue",
  previousPage: "Avis plus récents",
  nextPage: "Avis plus anciens",
  pagination: "Pages de mes avis",
  pageStatus: (page: number, total: number): string => `Page ${page} sur ${total}`,
  deleted: "Ton avis a été supprimé : tu peux de nouveau noter ce produit.",
} as const;

/** Review form (publish and edit). */
export const REVIEW_FORM_MESSAGES = {
  ratingLegend: "Ta note",
  starName: (rating: number): string => `${rating} étoile${rating > 1 ? "s" : ""}`,
  commentLabel: "Ton commentaire (facultatif)",
  commentHint: "Ce que tu as aimé, ce qui t'a moins plu… Ton prénom sera affiché avec ton avis.",
  counter: (length: number): string => `${length.toLocaleString(UI_LOCALE)} / ${MAX_LENGTH_TEXT}`,
  publish: "Publier mon avis",
  cancel: "Annuler",
  publishing: "Publication…",
  update: "Enregistrer",
  updating: "Enregistrement…",
  published: "Merci ! Ton avis est publié.",
  updated: "Ton avis est mis à jour.",
  errors: {
    rating: "Choisis une note de 1 à 5 étoiles.",
    commentTooLong: `Ton commentaire dépasse ${MAX_LENGTH_TEXT} caractères.`,
    form: "Vérifie ta note et ton commentaire.",
    rejected:
      "Ton commentaire n'a pas pu être publié tel quel : reformule-le, ta note et ton texte sont gardés.",
    notAllowed:
      "Ce produit ne peut plus être noté pour cette commande. La liste a été mise à jour.",
    notFound: "Cet avis n'existe plus. La liste a été mise à jour.",
    forbidden: "Tu ne peux pas modifier cet avis. La liste a été mise à jour.",
    sessionExpired: "Ta session a expiré. Reconnecte-toi : ta note et ton texte sont gardés.",
    signIn: "Me reconnecter",
    rateLimited: (seconds: number): string =>
      `Trop de tentatives d'un coup. Réessaie dans ${seconds} s.`,
    rateLimitedUnknown: "Trop de tentatives d'un coup. Réessaie dans un instant.",
    unavailable: "La boutique ne répond pas pour le moment. Réessaie dans un instant.",
    unknown: "Ton avis n'a pas pu être enregistré. Réessaie dans un instant.",
  },
} as const;

/** Deletion confirmation. */
export const DELETE_REVIEW_MESSAGES = {
  title: "Supprimer ton avis ?",
  body: (product: string): string =>
    `Ton avis sur ${product} disparaîtra de la fiche du produit. Tu pourras en publier un nouveau.`,
  confirm: "Supprimer mon avis",
  deleting: "Suppression…",
  cancel: "Garder mon avis",
} as const;

/** Order detail: link to review a bought product (FR-019). */
export const ORDER_REVIEW_MESSAGES = {
  review: "Donner mon avis",
  reviewLabel: (product: string): string => `Donner ton avis sur ${product}`,
} as const;
