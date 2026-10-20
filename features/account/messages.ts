/**
 * User-facing text of the account area (French, tutoiement) — constitution XI. Created with the
 * account navigation (US3); completed by « Mon profil » (US4) and « Ma carte » (US5).
 *
 * @see specs/003-account-orders/spec.md US3 to US6
 */

/** Navigation of the account area. */
export const ACCOUNT_NAV_MESSAGES = {
  label: "Mon compte",
  title: "Mon compte",
  orders: "Mes commandes",
  wishlist: "Ma wishlist",
  profile: "Mon profil",
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
