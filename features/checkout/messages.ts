/**
 * User-facing text of the checkout and of the order confirmation (French, tutoiement) —
 * constitution XI.
 *
 * Shipping speed and carrier names are shared with the product page (`DELIVERY_MESSAGES`).
 *
 * @see specs/003-account-orders/spec.md US1, US2
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
import { CheckoutStep } from "@/lib/enums/checkout";
import { PaymentType } from "@/lib/enums/order";

/** Page, steps and fields of the single-page checkout. */
export const CHECKOUT_MESSAGES = {
  pageTitle: "Commande",
  pageDescription: "Adresse, livraison, paiement : on vérifie tout avant de valider.",
  metaTitle: "Commande — cybertech",
  stepsLabel: "Étapes de la commande",
  stepTitles: {
    [CheckoutStep.ADDRESS]: "Adresse de livraison",
    [CheckoutStep.SHIPPING]: "Livraison",
    [CheckoutStep.PAYMENT]: "Paiement",
  } satisfies Record<CheckoutStep, string>,
  stepPosition: (position: number, total: number): string => `Étape ${position} sur ${total}`,
  stepDone: "Terminée",
  stepCurrent: "En cours",
  stepUpcoming: "À venir",
  continue: "Continuer",
  edit: "Modifier",
  editStep: (title: string): string => `Modifier : ${title}`,
  addressFields: {
    street: "Rue et numéro",
    zipCode: "Code postal",
    city: "Ville",
    country: "Pays",
  },
  addressHint:
    "Pré-remplie depuis ton profil ; une modification ici ne vaut que pour cette commande.",
  addressReset: "Ta session a expiré : ton adresse a été reprise depuis ton profil, vérifie-la.",
  requiredField: "Ce champ est obligatoire.",
  fieldTooLong: (max: number): string => `${max} caractères maximum.`,
  shippingLegend: "Mode de livraison",
  shippingEstimate: "Délai estimatif",
  shippingDelay: (min: number, max: number): string =>
    min === max ? `Livré en ${min} jour${min > 1 ? "s" : ""}` : `Livré en ${min} à ${max} jours`,
  pickupLabel: "Retrait en magasin",
  pickupSoon: "Bientôt disponible",
  shippingUnavailable:
    "On n'arrive pas à charger les modes de livraison. Réessaie dans un instant.",
  paymentLegend: "Moyen de paiement",
  paymentLabels: {
    [PaymentType.MASTERCARD]: "Mastercard",
    [PaymentType.VISA]: "Visa",
    [PaymentType.APPLE_PAY]: "Apple Pay",
    [PaymentType.GOOGLE_PAY]: "Google Pay",
  } satisfies Record<PaymentType, string>,
  paymentSimulated:
    "Paiement simulé : aucun débit réel n'est fait et tu n'as aucun numéro de carte à saisir.",
  chooseOption: "Choisis une option pour continuer.",
  awaitingCart: "On récupère ton panier…",
} as const;

/** Summary of the checkout, with the amounts of the backend quote. */
export const CHECKOUT_SUMMARY_MESSAGES = {
  title: "Récapitulatif",
  linesLabel: "Articles de la commande",
  quantity: (count: number): string => `× ${count}`,
  subtotal: "Sous-total",
  discount: "Remise",
  discountWithKey: (key: string): string => `Remise ${key}`,
  shipping: "Livraison",
  total: "Total",
  updating: "Mise à jour des montants…",
  amountsAnnounce: (total: string): string => `Total mis à jour : ${total}.`,
  quoteUnavailable: "On n'arrive pas à calculer le montant de ta commande.",
  retry: "Réessayer",
  place: "Valider la commande",
  placing: "Validation…",
  placeHint: "Termine les étapes pour valider ta commande.",
  totalChanged: (total: string): string =>
    `Ton panier a changé : le nouveau total est de ${total}. Vérifie-le puis valide à nouveau.`,
} as const;

/** Errors of the checkout, by front error code (contracts §1.1). */
export const CHECKOUT_ERROR_MESSAGES = {
  emptyCart: "Ton panier est vide : ajoute des articles avant de commander.",
  insufficientStock:
    "Certains articles n'ont plus assez de stock. On t'a ramené au panier pour ajuster.",
  accountInactive:
    "Ton compte est désactivé : tu ne peux pas commander pour l'instant. Contacte le support.",
  discountInvalid:
    "Cette réduction n'est plus valable. On a recalculé ta commande sans elle : vérifie le total puis valide à nouveau.",
  rateLimited: (seconds: number | undefined): string =>
    seconds === undefined
      ? "Trop de demandes d'un coup : réessaie dans un instant."
      : `Trop de demandes d'un coup : réessaie dans ${seconds} s.`,
  unavailable: "Le service de commande ne répond pas. Réessaie dans un instant.",
  sessionExpired: "Ta session a expiré : reconnecte-toi pour finir ta commande.",
  noSavedCard:
    "Pour commander, ton compte doit avoir une carte enregistrée, et le site ne permet pas encore d'en ajouter. Contacte le support.",
  profileMissing: "On ne retrouve pas ton profil. Reconnecte-toi ou contacte le support.",
  unknown: "Un imprévu est survenu. Réessaie dans un instant.",
} as const;

/** Confirmation page and payment follow-up. */
export const CONFIRMATION_MESSAGES = {
  pageTitle: "Merci pour ta commande",
  metaTitle: "Confirmation de commande — cybertech",
  orderNumber: (shortId: string): string => `Commande n° ${shortId}`,
  pending: "Paiement en cours…",
  pendingHint: "On attend la réponse de la banque, ça ne prend que quelques secondes.",
  paid: "Paiement accepté : ta commande est confirmée.",
  failed: "Ton paiement a été refusé. Aucun montant n'a été débité.",
  retry: "Relancer le paiement",
  retrying: "Nouvelle tentative…",
  alreadyPaid: "Ce paiement avait déjà été accepté : ta commande est confirmée.",
  retryImpossible: "La relance n'est pas possible pour l'instant.",
  timeout:
    "Le paiement prend plus de temps que prévu. Tu pourras suivre son statut un peu plus tard.",
  linesTitle: "Ce que tu as commandé",
  totalPaid: "Total",
  backToCart: "Retour au panier",
  backHome: "Retour à l'accueil",
  continueShopping: "Continuer mes achats",
  viewOrder: "Voir ma commande",
} as const;
