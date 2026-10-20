/**
 * User-facing text of « Mes commandes », of the order detail and of the order edit (French,
 * tutoiement) — constitution XI.
 *
 * Shipping speed and carrier names are shared with the product page (`DELIVERY_MESSAGES`),
 * payment labels with the checkout (`CHECKOUT_MESSAGES`).
 *
 * @see specs/003-account-orders/spec.md US3, FR-022 to FR-027
 */
import { OrderChangeKind, OrderOutcome, OrderStatus, StatusTone } from "@/lib/enums/order";

/** Label of every backend status, as shown in the list, the badge and the timeline. */
const STATUS_LABELS = {
  [OrderStatus.CREATED]: "Créée",
  [OrderStatus.AWAITING_PAYMENT]: "En attente de paiement",
  [OrderStatus.PAYMENT_FAILED]: "Paiement refusé",
  [OrderStatus.PAID]: "Payée",
  [OrderStatus.AWAITING_SHIPPING]: "En préparation",
  [OrderStatus.SHIPPED]: "Expédiée",
  [OrderStatus.DELIVERED]: "Livrée",
  [OrderStatus.RETURNED]: "Retournée",
  [OrderStatus.CANCELED]: "Annulée",
  [OrderStatus.REFUNDED]: "Remboursée",
} as const satisfies Record<OrderStatus, string>;

/** « Mes commandes »: page, list, filter, pagination and empty state. */
export const ORDERS_MESSAGES = {
  pageTitle: "Mes commandes",
  metaTitle: "Mes commandes — cybertech",
  pageDescription:
    "Retrouve tes commandes, suis leur avancement et modifie-les tant qu'elles ne sont pas parties.",
  breadcrumbAccount: "Mon compte",
  statusLabels: STATUS_LABELS,
  toneLabels: {
    [StatusTone.PROGRESS]: "En cours",
    [StatusTone.SUCCESS]: "Réussi",
    [StatusTone.WARNING]: "À traiter",
    [StatusTone.NEUTRAL]: "Terminée",
  } satisfies Record<StatusTone, string>,
  listLabel: "Liste de tes commandes",
  orderNumber: (shortId: string): string => `Commande n° ${shortId}`,
  placedOn: (day: string): string => `Passée le ${day}`,
  itemCount: (count: number): string => `${count} article${count > 1 ? "s" : ""}`,
  total: "Total",
  viewOrder: "Voir le détail",
  filterLegend: "Filtrer par statut",
  filterApply: "Filtrer",
  filterReset: "Tout afficher",
  emptyTitle: "Pas encore de commande",
  emptyBody: "Quand tu passeras commande, tu la retrouveras ici avec son suivi.",
  emptyFilteredTitle: "Aucune commande avec ce statut",
  emptyFilteredBody: "Essaie un autre statut ou affiche toutes tes commandes.",
  goToCatalog: "Découvrir le catalogue",
  paginationLabel: "Pages de tes commandes",
  previousPage: "Page précédente",
  nextPage: "Page suivante",
  pageLink: (page: number): string => `Page ${page}`,
} as const;

/** Order detail: breakdown, timeline, lines, address and actions. */
export const ORDER_DETAIL_MESSAGES = {
  metaTitle: "Détail de commande — cybertech",
  breadcrumbOrders: "Mes commandes",
  statusLabel: "Statut",
  linesTitle: "Articles",
  quantity: (count: number): string => `× ${count}`,
  unitPrice: (price: string): string => `${price} l'unité`,
  removedFromCatalog: "Plus au catalogue",
  addressTitle: "Livraison",
  shippingLine: (type: string, provider: string): string => `${type} — ${provider}`,
  breakdownTitle: "Montant",
  subtotal: "Sous-total",
  discount: "Remise",
  discountWithKey: (key: string): string => `Remise ${key}`,
  shipping: "Livraison",
  total: "Total",
  refunded: "Remboursé",
  totalOnly: "Commande passée avant le détail des montants : seul le total payé est connu.",
  timelineTitle: "Avancement",
  timelineLabel: "Étapes de la commande",
  stepDone: "terminée",
  stepCurrent: "étape actuelle",
  stepUpcoming: "à venir",
  outcomeLabel: "Issue",
  outcomes: {
    [OrderOutcome.CANCELED]: "Commande annulée",
    [OrderOutcome.REFUNDED]: "Commande remboursée",
    [OrderOutcome.RETURNED]: "Commande retournée",
    [OrderOutcome.PAYMENT_FAILED]: "Paiement refusé",
  } satisfies Record<OrderOutcome, string>,
  actionsTitle: "Actions",
  edit: "Modifier la commande",
  cancel: "Annuler la commande",
  noAction: "Cette commande ne peut plus être modifiée ni annulée.",
  paymentTitle: "Paiement",
  notFoundTitle: "Commande introuvable",
  notFoundBody: "Cette commande n'existe pas ou n'est pas rattachée à ton compte.",
  backToOrders: "Voir mes commandes",
} as const;

/** Cancellation dialog and its outcomes. */
export const CANCEL_ORDER_MESSAGES = {
  title: "Annuler cette commande ?",
  body: "Le paiement éventuel te sera remboursé sur ton moyen de paiement. Cette action est définitive.",
  confirm: "Oui, annuler",
  confirming: "Annulation…",
  keep: "Garder ma commande",
  done: "Ta commande est annulée.",
  locked: "Cette commande est déjà en préparation ou expédiée : elle ne peut plus être annulée.",
  refundFailed:
    "La commande est annulée mais le remboursement n'a pas abouti. Contacte le support avec le numéro de commande, on s'en occupe.",
} as const;

/** Order edit page. */
export const ORDER_EDIT_MESSAGES = {
  pageTitle: "Modifier ma commande",
  metaTitle: "Modifier ma commande — cybertech",
  breadcrumb: "Modifier",
  intro: "Change les quantités, retire ou ajoute des articles, ou mets à jour la livraison.",
  discountKept: (key: string): string => `La réduction d'origine (${key}) est conservée.`,
  noDiscount: "Cette commande a été passée sans réduction ; aucune ne peut être ajoutée ici.",
  linesTitle: "Articles",
  quantityLabel: (name: string): string => `Quantité de ${name}`,
  remove: (name: string): string => `Retirer ${name}`,
  lastLine: "Une commande garde au moins un article. Pour tout retirer, annule la commande.",
  cancelInstead: "Annuler la commande",
  addedLine: "Ajouté",
  stockIssue: "Stock insuffisant pour cette quantité.",
  maxLines: (max: number): string => `${max} articles différents au maximum.`,
  searchLabel: "Ajouter un produit",
  searchPlaceholder: "Rechercher un produit…",
  searchIdle: "Tape le nom d'un produit pour l'ajouter.",
  searchLoading: "Recherche…",
  searchEmpty: "Aucun produit trouvé.",
  searchError: "La recherche ne répond pas. Réessaie dans un instant.",
  addProduct: (name: string): string => `Ajouter ${name}`,
  addressTitle: "Adresse de livraison",
  shippingTitle: "Livraison",
  paymentTitle: "Moyen de paiement",
  paymentRequired: "Choisis le moyen de paiement à utiliser pour un éventuel complément.",
  paymentHint: "Le moyen de paiement n'est pas conservé avec la commande : choisis-le de nouveau.",
  fixFields: "Vérifie les champs signalés avant d'enregistrer.",
  save: "Enregistrer les modifications",
  saving: "Enregistrement…",
  backToOrder: "Retour à la commande",
  notEditable: "Cette commande ne peut plus être modifiée.",
  savedTitle: "Modifications enregistrées",
  previousTotal: "Ancien total",
  newTotal: "Nouveau total",
  changes: {
    [OrderChangeKind.CHARGED]: "La différence est débitée sur ton moyen de paiement.",
    [OrderChangeKind.REFUNDED]: (amount: string): string =>
      `${amount} remboursés au total sur cette commande.`,
    [OrderChangeKind.UNCHANGED]: "Le montant de ta commande ne change pas.",
  },
  viewOrder: "Voir ma commande",
  sessionExpired:
    "Ta session a expiré : reconnecte-toi, tes modifications seront reprises (rien n'a été enregistré).",
  draftRestored: "On a repris tes modifications : vérifie-les puis enregistre.",
} as const;

/** Errors of the order actions, by front error code (contracts §1.1). */
export const ORDER_ERROR_MESSAGES = {
  locked:
    "Cette commande vient de partir en préparation ou d'être expédiée : elle ne peut plus être modifiée.",
  insufficientStock:
    "Il n'y a plus assez de stock pour un article ajouté ou augmenté. Ajuste les lignes signalées.",
  paymentFailed:
    "Le complément de paiement a été refusé : tes modifications ne sont pas enregistrées.",
  notFound: "On ne retrouve pas cette commande.",
  rateLimited: (seconds: number | undefined): string =>
    seconds === undefined
      ? "Trop de demandes d'un coup : réessaie dans un instant."
      : `Trop de demandes d'un coup : réessaie dans ${seconds} s.`,
  unavailable: "Le service de commande ne répond pas. Réessaie dans un instant.",
  invalid: "Certaines informations sont incomplètes : vérifie les champs signalés.",
  noSavedCard: "Ajoute une carte sur ton compte avant de modifier cette commande.",
  unknown: "Un imprévu est survenu. Réessaie dans un instant.",
} as const;
