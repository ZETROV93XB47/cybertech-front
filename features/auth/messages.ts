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
  loginTitle: "Connexion",
  loginDescription: "Connecte-toi pour retrouver ton panier sur tous tes appareils.",
  loginRedirecting: "On t'emmène vers la page de connexion…",
  loginManual: "Si rien ne se passe, utilise le bouton ci-dessous.",
  loginFailed: "La connexion n'a pas abouti. Réessaie.",
  welcomeBack: (firstName: string): string => `Content de te revoir, ${firstName}`,
  sessionExpired: "Ta session a expiré, reconnecte-toi.",
  signedOut: "Tu es déconnecté. À bientôt !",
} as const;
