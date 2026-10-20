/**
 * User-facing text of the account area (French, tutoiement) — constitution XI. Created with the
 * account navigation (US3); completed by « Mon profil » (US4) and « Ma carte » (US5).
 *
 * @see specs/003-account-orders/spec.md US3 to US6
 */
import { BankCardType } from "@/lib/enums/bank-card";

/** Navigation of the account area. */
export const ACCOUNT_NAV_MESSAGES = {
  label: "Mon compte",
  title: "Mon compte",
  orders: "Mes commandes",
  wishlist: "Ma wishlist",
  profile: "Mon profil",
  card: "Ma carte",
} as const;

/** « Mon profil » (US4): page, read-only identity, form, errors and confirmation. */
export const PROFILE_MESSAGES = {
  pageTitle: "Mon profil",
  metaTitle: "Mon profil — cybertech",
  pageDescription: "Tes coordonnées servent à préremplir tes commandes.",
  identityTitle: "Mon compte",
  emailLabel: "Adresse email",
  usernameLabel: "Nom d'utilisateur",
  addressLabel: "Adresse enregistrée",
  noAddress: "Aucune adresse enregistrée pour l'instant.",
  readOnlyNotice:
    "L'email et le nom d'utilisateur ne se modifient pas ici : ils identifient ton compte.",
  passwordLink: "Changer de mot de passe (nouvel onglet)",
  passwordHint: "Le mot de passe se change dans la console de ton compte.",
  formTitle: "Modifier mes informations",
  identityLegend: "Identité",
  contactLegend: "Contact",
  addressLegend: "Adresse",
  labels: {
    firstName: "Prénom",
    lastName: "Nom",
    phoneNumber: "Téléphone",
    street: "Rue et numéro",
    zipCode: "Code postal",
    city: "Ville",
    country: "Pays",
  },
  phoneHint:
    "Pour ta sécurité, ton numéro n'est jamais réaffiché : un numéro saisi ici remplacera l'ancien.",
  addressHint: "Laisse un champ vide pour garder la valeur enregistrée.",
  submit: "Enregistrer",
  submitting: "Enregistrement…",
  success: "C'est enregistré : ton profil est à jour.",
  errors: {
    form: "Vérifie les champs signalés.",
    nameLength: "Entre 2 et 50 caractères.",
    phoneNumber: "Ce numéro ne semble pas valide (chiffres, espaces, points ou tirets).",
    fieldTooLong: (max: number): string => `${max} caractères maximum.`,
    invalidField: "Cette valeur n'est pas acceptée.",
    sessionExpired: "Ta session a expiré : reconnecte-toi, tes saisies sont conservées ici.",
    signInAgain: "Me reconnecter",
    notFound: "On ne retrouve pas ton profil. Reconnecte-toi ou contacte le support.",
    rateLimited: (seconds: number): string =>
      `Trop de demandes d'un coup : réessaie dans ${seconds} s.`,
    rateLimitedUnknown: "Trop de demandes d'un coup : réessaie dans un instant.",
    unavailable: "Le service ne répond pas. Réessaie dans un instant.",
    unknown: "Un imprévu est survenu. Réessaie dans un instant.",
  },
  notFoundTitle: "Profil introuvable",
} as const;

/** « Ma carte » (US5): saved card, edit, delete, « Ajouter une carte », errors. */
export const CARD_MESSAGES = {
  pageTitle: "Ma carte",
  metaTitle: "Ma carte — cybertech",
  pageDescription: "La carte débitée à chaque commande et à chaque relance de paiement.",
  cardTitle: "Carte enregistrée",
  cardLabel: (network: string, lastDigits: string): string =>
    `Carte ${network} se terminant par ${lastDigits}`,
  holderLabel: "Titulaire",
  expiryLabel: "Expire fin",
  networks: {
    [BankCardType.VISA]: "Visa",
    [BankCardType.MASTERCARD]: "Mastercard",
    [BankCardType.AMERICAN_EXPRESS]: "American Express",
    [BankCardType.DISCOVER]: "Discover",
    [BankCardType.OTHER]: "Autre",
  } satisfies Record<BankCardType, string>,
  editTitle: "Modifier le titulaire ou l'expiration",
  editHint: "Le numéro ne se modifie pas : pour changer de carte, remplace-la.",
  fields: {
    holder: "Titulaire de la carte",
    number: "Numéro de carte",
    expiryMonth: "Mois d'expiration",
    expiryYear: "Année d'expiration",
    network: "Réseau",
  },
  expiryLegend: "Date d'expiration",
  selectPlaceholder: "Choisir",
  networkHint: "Déduit du numéro ; tu peux le changer.",
  save: "Enregistrer",
  saving: "Enregistrement…",
  saved: "C'est enregistré : ta carte est à jour.",
  deleteOpen: "Supprimer la carte",
  deleteTitle: "Supprimer ta carte ?",
  deleteBody:
    "Sans carte enregistrée, tu ne pourras plus commander tant que tu n'en ajoutes pas une.",
  deleteConfirm: "Oui, supprimer",
  deleteCancel: "Garder ma carte",
  deleting: "Suppression…",
  deleted: "Ta carte a été supprimée.",
  replaceOpen: "Remplacer ma carte",
  replaceCancel: "Annuler",
  replaceTitle: "Remplacer ta carte ?",
  replaceBody: "Ta carte actuelle sera supprimée puis remplacée par celle que tu viens de saisir.",
  replaceConfirm: "Oui, remplacer",
  noCardTitle: "Aucune carte enregistrée",
  noCardBody:
    "Une carte est nécessaire pour commander : elle est débitée à chaque commande et à chaque relance de paiement.",
  addTitle: "Ajouter une carte",
  addSubmit: "Enregistrer la carte",
  adding: "Enregistrement de la carte…",
  added: "Ta carte est enregistrée.",
  returning: "Ta carte est enregistrée, on te ramène à ta commande…",
  testNotice:
    "Paiement de test : 1111 1111 1111 1111 paie, tout autre numéro est refusé au paiement. N'entre jamais une vraie carte.",
  numberHint: "13 à 19 chiffres. Aucun cryptogramme n'est demandé.",
  errors: {
    form: "Vérifie les champs signalés.",
    holderRequired: "Indique le nom du titulaire.",
    numberInvalid: "Le numéro doit compter de 13 à 19 chiffres.",
    expiryRequired: "Choisis le mois et l'année.",
    expiryPast: "Cette date est passée : choisis une expiration à venir.",
    cardRemoved:
      "Ton ancienne carte a été supprimée, mais la nouvelle n'a pas pu être enregistrée : ressaisis-la pour pouvoir commander.",
    cardKept:
      "On n'a pas pu remplacer ta carte : ton ancienne carte est toujours enregistrée. Réessaie dans un instant.",
    deleteNotApplied:
      "La suppression n'a pas abouti : ta carte est toujours enregistrée. Réessaie dans un instant.",
    alreadyHasCard: "Une carte est déjà enregistrée : remplace-la plutôt.",
    noCard: "Aucune carte n'est enregistrée sur ton compte.",
    sessionExpired: "Ta session a expiré : reconnecte-toi, ta saisie est conservée ici.",
    sessionExpiredNumber:
      "Ta session a expiré : reconnecte-toi puis ressaisis le numéro (il n'est jamais conservé).",
    signInAgain: "Me reconnecter",
    rateLimited: (seconds: number): string =>
      `Trop de demandes d'un coup : réessaie dans ${seconds} s.`,
    rateLimitedUnknown: "Trop de demandes d'un coup : réessaie dans un instant.",
    unavailable: "Le service ne répond pas. Réessaie dans un instant.",
    unknown: "Un imprévu est survenu. Réessaie dans un instant.",
  },
} as const;
