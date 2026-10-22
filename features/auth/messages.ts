/**
 * User-facing text of sign-in, sign-out and session (French, tutoiement) — constitution XI.
 *
 * @see specs/001-catalog-auth-cart/spec.md US3
 */

/** Text of the account menu, the sign-in page and the session messages. */
export const AUTH_MESSAGES = {
  signIn: "Se connecter",
  signOut: "Se déconnecter",
  signingOut: "Déconnexion…",
  accountMenuLabel: (name: string): string => `Compte de ${name}`,
  /**
   * Greeting at the top of the header account menu.
   *
   * @param firstName - First name of the signed-in user.
   * @returns The greeting.
   */
  accountMenuGreeting: (firstName: string): string => `Bonjour ${firstName}`,
  /** Name of the list of links of the header account menu (distinct from the account nav). */
  accountMenuLinks: "Raccourcis de ton compte",
  loginTitle: "Connexion",
  loginDescription: "Connecte-toi pour retrouver ton panier sur tous tes appareils.",
  loginRedirecting: "On t'emmène vers la page de connexion…",
  loginManual: "Si rien ne se passe, utilise le bouton ci-dessous.",
  loginFailed: "La connexion n'a pas abouti. Réessaie.",
  welcomeBack: (firstName: string): string => `Content de te revoir, ${firstName}`,
  sessionExpired: "Ta session a expiré, reconnecte-toi.",
  signedOut: "Tu es déconnecté. À bientôt !",
} as const;

/** Text of the registration page (US2, FR-011 to FR-014). */
export const REGISTER_MESSAGES = {
  pageTitle: "Créer un compte",
  pageDescription:
    "Quelques informations pour préparer tes commandes. Tous les champs sont requis, sauf la date de naissance.",
  headerLink: "Créer un compte",
  submit: "Créer mon compte",
  submitting: "Création…",
  identitySection: "Toi",
  contactSection: "Te joindre",
  addressSection: "Ton adresse",
  securitySection: "Ton mot de passe",
  labels: {
    email: "Email",
    firstName: "Prénom",
    lastName: "Nom",
    sex: "Sexe",
    sexFemale: "Femme",
    sexMale: "Homme",
    phoneNumber: "Téléphone",
    favoriteCommunicationChanel: "Comment préfères-tu qu'on te contacte ?",
    channelEmail: "Par email",
    channelSms: "Par SMS",
    street: "Rue",
    city: "Ville",
    zipCode: "Code postal",
    country: "Pays",
    birthDate: "Date de naissance (facultatif)",
    password: "Mot de passe",
  },
  passwordHint: "8 caractères minimum.",
  channelPlaceholder: "Choisis une option",
  alreadyHaveAccount: "Tu as déjà un compte ?",
  errors: {
    email: "Vérifie ton adresse email.",
    nameLength: "Entre 2 et 50 caractères.",
    choose: "Choisis une option.",
    phoneNumber: "Indique ton numéro de téléphone.",
    required: "Ce champ est requis.",
    birthDate: "La date doit être dans le passé.",
    password: "8 caractères minimum.",
    alreadyExists: "Un compte existe déjà avec cet email.",
    rateLimited: (seconds: number): string => `Doucement ! Réessaie dans ${seconds} s.`,
    rateLimitedUnknown: "Doucement ! Réessaie dans quelques instants.",
    form: "Certains champs sont à corriger.",
    unavailable: "On n'arrive pas à joindre la boutique. Réessaie dans un instant.",
    unknown: "Quelque chose s'est mal passé. Réessaie.",
  },
  successTitle: "Ton compte est prêt",
  successBody: (email: string): string =>
    `Ton compte ${email} a bien été créé. Connecte-toi pour retrouver ton panier.`,
} as const;
