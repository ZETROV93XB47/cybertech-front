/**
 * User-facing text of the browser notifications (French, tutoiement) — constitution XI. The
 * notifications themselves are written by the backend; these texts only explain how to turn them
 * on, and never mention an amount (FR-018).
 *
 * @see specs/005-web-push-notifications/spec.md FR-005
 */

/** Opt-in on the order confirmation page and switch of the profile. */
export const PUSH_MESSAGES = {
  optInTitle: "Sois prévenu quand ta commande est expédiée",
  optInBody:
    "Active les notifications de ton navigateur : on te prévient quand ton paiement est confirmé et quand ta commande part, même si l'onglet est fermé.",
  enable: "Activer les notifications",
  enabling: "Activation…",
  enabledTitle: "Notifications activées",
  enabledBody:
    "Tu seras prévenu sur ce navigateur à chaque étape de ta commande. Tu peux les couper depuis ton profil.",
  toggleLabel: "Notifications du navigateur",
  toggleDescription:
    "Paiement confirmé, commande expédiée : reçois une notification sur ce navigateur.",
  toggleEnabled:
    "Activées sur ce navigateur : tu es prévenu à chaque étape de ta commande, même onglet fermé.",
  deniedTitle: "Notifications bloquées",
  denied:
    "Tu as bloqué les notifications pour ce site. Pour les réautoriser, clique sur le cadenas à gauche de l'adresse, puis autorise les notifications.",
  unavailable:
    "Les notifications sont momentanément indisponibles. Rien n'a changé : réessaie un peu plus tard.",
  conflict:
    "Ce navigateur reçoit déjà les notifications d'un autre compte. Tu peux les activer pour ton compte à la place.",
  reclaim: "Activer pour mon compte",
  installRequired:
    "Sur iPhone et iPad, les notifications ne marchent qu'une fois le site ajouté à l'écran d'accueil (Partager › Sur l'écran d'accueil).",
  error: "Les notifications n'ont pas pu être activées. Réessaie.",
  sessionExpired: "Ta session a expiré : reconnecte-toi pour activer les notifications.",
  disableError: "Les notifications n'ont pas pu être coupées. Réessaie.",
  sectionLabel: "Notifications",
} as const;
