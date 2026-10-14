/**
 * User-facing text of the catalog (French, tutoiement) — constitution XI.
 *
 * @see specs/001-catalog-auth-cart/spec.md US1
 */
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import { UI_LOCALE } from "@/lib/format";

/** Greetings of the home page, chosen from the visitor's local time (FR-001). */
export const GREETING_MESSAGES = {
  /** Neutral text rendered on the server, before the browser knows the local time. */
  neutral: "Bienvenue",
  morning: "Bonjour",
  evening: "Bonsoir",
  /** Shown instead of the greeting to a visitor with recently viewed products. */
  returning: "Content de te revoir",
} as const;

/** Home page. */
export const HOME_MESSAGES = {
  intro: "Ordinateurs et écrans choisis pour durer. Cherche un modèle, compare, ajoute au panier.",
  searchCta: "Parcourir le catalogue",
  bestSellersTitle: "Les plus demandés",
  bestSellersEmpty: "Les meilleures ventes s'afficheront ici dès les premières commandes.",
  recentlyViewedTitle: "Tu regardais",
  discountsLabel: "Offres en cours",
  discountPercentage: (key: string, percentage: number): string =>
    `${key} : ${percentage} % de remise sur ta commande`,
  discountFixed: (key: string, amount: string): string =>
    `${key} : ${amount} de remise sur ta commande`,
  discountBuyOneGetOne: (key: string): string => `${key} : un article acheté, le second offert`,
  discountMinOrder: (amount: string): string => `dès ${amount} d'achat`,
  discountUntil: (date: string): string => `jusqu'au ${date}`,
  discountHint: "La remise s'applique au moment de la commande.",
  categoriesTitle: "Catégories",
  emptyTitle: "Rien à te montrer pour l'instant",
  emptyBody:
    "Les meilleures ventes et les produits que tu consultes apparaîtront ici. En attendant, le catalogue t'attend.",
} as const;

/** Category tiles of the home page (FR-029). */
export const CATEGORY_TILE_MESSAGES = {
  count: (count: number): string =>
    count === 1 ? "1 produit" : `${count.toLocaleString(UI_LOCALE)} produits`,
  empty: "Aucun produit pour l'instant",
} as const;

/** Breadcrumb of the catalog. */
export const CATALOG_BREADCRUMB_MESSAGES = {
  label: "Fil d'Ariane",
  home: "Accueil",
} as const;

/** Category names shown in filters and on cards. */
export const CATEGORY_LABELS: Readonly<Record<CategoryKey, string>> = {
  [CategoryKey.COMPUTER]: "Ordinateurs",
  [CategoryKey.MONITOR]: "Écrans",
};

/** Brand names as the brands write them (the backend enum is upper case). */
export const BRAND_LABELS: Readonly<Record<Brand, string>> = {
  [Brand.ASUS]: "ASUS",
  [Brand.HP]: "HP",
  [Brand.LENOVO]: "Lenovo",
  [Brand.DELL]: "Dell",
  [Brand.AORUS]: "Aorus",
  [Brand.MSI]: "MSI",
  [Brand.ACER]: "Acer",
  [Brand.TOSHIBA]: "Toshiba",
  [Brand.ALIENWARE]: "Alienware",
  [Brand.MICROSOFT]: "Microsoft",
  [Brand.ALTYK]: "Altyk",
  [Brand.GIGABYTE]: "Gigabyte",
  [Brand.SAMSUNG]: "Samsung",
  [Brand.LG]: "LG",
  [Brand.AOC]: "AOC",
  [Brand.IIYAMA]: "iiyama",
  [Brand.BENQ]: "BenQ",
  [Brand.PHILIPS]: "Philips",
  [Brand.VIEWSONIC]: "ViewSonic",
  [Brand.EIZO]: "EIZO",
  [Brand.CORSAIR]: "Corsair",
  [Brand.LDLC]: "LDLC",
  [Brand.XIAOMI]: "Xiaomi",
  [Brand.APPLE]: "Apple",
  [Brand.GARMIN]: "Garmin",
  [Brand.HUAWEI]: "Huawei",
  [Brand.AMAZFIT]: "Amazfit",
  [Brand.WITHINGS]: "Withings",
  [Brand.GOOGLE]: "Google",
  [Brand.POLAR]: "Polar",
  [Brand.SUUNTO]: "Suunto",
  [Brand.COROS]: "COROS",
  [Brand.FITBIT]: "Fitbit",
  [Brand.MOTOROLA]: "Motorola",
  [Brand.ONEPLUS]: "OnePlus",
  [Brand.OPPO]: "OPPO",
  [Brand.HONOR]: "Honor",
  [Brand.NOTHING]: "Nothing",
  [Brand.SONY]: "Sony",
  [Brand.CROSSCALL]: "Crosscall",
  [Brand.REALME]: "realme",
  [Brand.FAIRPHONE]: "Fairphone",
  [Brand.NOKIA]: "Nokia",
};

/**
 * French labels of the known category attributes. An attribute missing here falls back to the
 * `title` of the category JSON Schema, then to its humanised key.
 */
export const ATTRIBUTE_LABELS: Readonly<Record<string, string>> = {
  cpu: "Processeur",
  gpu: "Carte graphique",
  ram: "Mémoire vive",
  os: "Système",
  connectivity: "Connectique",
  displayType: "Type d'écran",
  memory: "Stockage",
  resolution: "Résolution",
  refreshRate: "Fréquence de rafraîchissement",
};

/** Units of the known numeric attributes, shown after the value and in range filters. */
export const ATTRIBUTE_UNITS: Readonly<Record<string, string>> = {
  ram: "Go",
  memory: "Go",
  refreshRate: "Hz",
};

/** Product list and filters. */
export const LIST_MESSAGES = {
  title: "Catalogue",
  searchTitle: (keyword: string): string => `Résultats pour « ${keyword} »`,
  resultCount: (count: number): string =>
    count === 1 ? "1 produit" : `${count.toLocaleString(UI_LOCALE)} produits`,
  filtersTitle: "Filtres",
  keywordLabel: "Mot-clé",
  keywordPlaceholder: "Modèle, marque, processeur…",
  categoryLegend: "Catégorie",
  allCategories: "Toutes",
  brandLegend: "Marques",
  priceLegend: "Prix",
  priceMinLabel: "Prix minimum en euros",
  priceMaxLabel: "Prix maximum en euros",
  priceHint: (min: string): string => `Le filtre de prix commence à ${min}.`,
  rangeMinLabel: (label: string): string => `${label} minimum`,
  rangeMaxLabel: (label: string): string => `${label} maximum`,
  rangeShortMin: "min",
  rangeShortMax: "max",
  booleanYes: "Oui",
  apply: "Appliquer les filtres",
  reset: "Réinitialiser les filtres",
  emptyTitle: "Aucun produit ne correspond à ces filtres",
  emptyBody:
    "Élargis la fourchette de prix, retire une marque ou réinitialise les filtres pour tout revoir.",
  gridLabel: "Produits",
  valueCount: (count: number): string => `(${count.toLocaleString(UI_LOCALE)})`,
  showAllValues: (count: number): string => `Voir tout (${count.toLocaleString(UI_LOCALE)})`,
  showFewerValues: "Voir moins",
  rangeBoundsHint: (lower: string, upper: string): string => `De ${lower} à ${upper}.`,
  rangeOutOfBounds: (lower: string, upper: string): string =>
    `Choisis une valeur entre ${lower} et ${upper}.`,
  rangeReversed: "Le maximum doit être supérieur ou égal au minimum.",
  facetsUnavailable:
    "Certains filtres sont momentanément indisponibles. Tu peux continuer avec les autres.",
  activeFiltersLabel: "Filtres actifs",
  removeFilter: (label: string): string => `Retirer le filtre ${label}`,
  clearAllFilters: "Tout effacer",
  keywordPill: (keyword: string): string => `Recherche : « ${keyword} »`,
  categoryPill: (category: string): string => `Catégorie : ${category}`,
  brandPill: (brand: string): string => `Marque : ${brand}`,
  pricePill: (range: string): string => `Prix : ${range}`,
  attributePill: (label: string, value: string): string => `${label} : ${value}`,
  rangeBetween: (min: string, max: string): string => `${min} – ${max}`,
  rangeFrom: (min: string): string => `à partir de ${min}`,
  rangeUpTo: (max: string): string => `jusqu'à ${max}`,
} as const;

/** Pagination of the product list. */
export const PAGINATION_MESSAGES = {
  label: "Pagination",
  previous: "Page précédente",
  next: "Page suivante",
  page: (page: number): string => `Page ${page}`,
  status: (page: number, total: number): string => `Page ${page} sur ${total}`,
} as const;

/** Live availability (FR-007): text always accompanies the colour (FR-039). */
export const AVAILABILITY_MESSAGES = {
  inStock: "En stock",
  lowStock: (count: number): string => `Plus que ${count}`,
  outOfStock: "Rupture",
  checking: "Vérification du stock…",
  unknown: "Stock non vérifié",
} as const;

/** Product page. */
export const PRODUCT_MESSAGES = {
  brandLabel: "Marque",
  specsTitle: "Caractéristiques",
  descriptionTitle: "Description",
  galleryLabel: "Photos du produit",
  photoAlt: (name: string, index: number): string => `${name}, photo ${index}`,
  showPhoto: (index: number): string => `Afficher la photo ${index}`,
  noPhoto: "Pas encore de photo pour ce produit",
  backToCatalog: "Retour au catalogue",
  notFoundTitle: "Produit introuvable",
  notFoundBody: "Ce produit n'existe pas ou n'est plus vendu. Le reste du catalogue t'attend.",
  breadcrumbLabel: "Fil d'Ariane",
  highlightsLabel: "Points clés",
  offerLabel: "Offre en cours",
  offerHint: "La remise s'applique au moment de la commande, sur tout le panier.",
  similarTitle: "Dans le même esprit",
  similarLabel: "Produits similaires",
  booleanTrue: "Oui",
  booleanFalse: "Non",
} as const;

/** ⌘K / Ctrl+K command palette (FR-009). */
export const PALETTE_MESSAGES = {
  trigger: "Rechercher",
  shortcutHint: "Ctrl K",
  title: "Recherche instantanée",
  description: "Tape le nom d'un produit, une marque ou un composant.",
  placeholder: "Rechercher un produit…",
  idle: "Commence à taper pour voir les produits.",
  loading: "Recherche…",
  empty: "Aucun produit ne correspond. Essaie un autre mot.",
  error: "La recherche ne répond pas. Réessaie dans un instant.",
  resultsHeading: "Produits",
  seeAll: (keyword: string): string => `Voir tous les résultats pour « ${keyword} »`,
} as const;

/** Delivery block of the product page (fees from the backend, indicative delays). */
export const DELIVERY_MESSAGES = {
  title: "Livraison",
  typeLabels: {
    [ShippingType.STANDARD]: "Livraison standard",
    [ShippingType.EXPRESS]: "Livraison express",
  } satisfies Record<ShippingType, string>,
  providerLabels: {
    [ShippingProvider.DHL]: "DHL",
    [ShippingProvider.FEDEX]: "FedEx",
  } satisfies Record<ShippingProvider, string>,
  delay: (min: number, max: number): string =>
    min === max
      ? `Livré en ${min} jour${min > 1 ? "s" : ""} ouvré${min > 1 ? "s" : ""}`
      : `Livré en ${min} à ${max} jours ouvrés`,
  expressTomorrow: (cutoffHour: number): string =>
    `Commande avant ${cutoffHour} h, tu es livré demain`,
  expressNextBusinessDay: "Commande maintenant, tu es livré le jour ouvré suivant",
  fromCost: (amount: string): string => `dès ${amount}`,
  carriers: (names: readonly string[]): string => `avec ${names.join(" ou ")}`,
  feesUnavailable: "Les frais de port s'afficheront au moment de la commande.",
  indicative: "Délais indicatifs, en jours ouvrés.",
} as const;

/** Customer reviews of the product page. */
export const REVIEW_MESSAGES = {
  title: "Avis clients",
  average: (value: string): string => `${value} sur 5`,
  noAverage: "—",
  count: (count: number): string => {
    if (count === 0) {
      return "Aucun avis pour l'instant";
    }
    return count === 1 ? "1 avis" : `${count.toLocaleString(UI_LOCALE)} avis`;
  },
  starsLabel: (rating: number): string => `${rating} étoile${rating > 1 ? "s" : ""}`,
  distributionLabel: "Répartition des notes",
  ratingLabel: (rating: number): string => `Note : ${rating} sur 5`,
  emptyTitle: "Sois le premier à donner ton avis",
  emptyBody:
    "Une fois ta commande reçue, tu pourras noter ce produit et partager ton expérience avec les autres clients.",
  listLabel: "Avis des clients",
} as const;
