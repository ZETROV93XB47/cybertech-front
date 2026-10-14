/**
 * Product brands, exactly as the backend `Brand` enum serialises them.
 *
 * 43 values since the backend catalog import of LDLC monitors, smartwatches, desktops and
 * smartphones (backend commits `ecc76e1` and `84dc038`).
 *
 * @see docs/backend/api-map.md D.10
 * @see Brand.java (backend `entities/enums`)
 */

/** Brand of a product. Values must stay identical to the backend enum names. */
export enum Brand {
  ASUS = "ASUS",
  HP = "HP",
  LENOVO = "LENOVO",
  DELL = "DELL",
  AORUS = "AORUS",
  MSI = "MSI",
  ACER = "ACER",
  TOSHIBA = "TOSHIBA",
  ALIENWARE = "ALIENWARE",
  MICROSOFT = "MICROSOFT",
  ALTYK = "ALTYK",
  GIGABYTE = "GIGABYTE",
  SAMSUNG = "SAMSUNG",
  LG = "LG",
  AOC = "AOC",
  IIYAMA = "IIYAMA",
  BENQ = "BENQ",
  PHILIPS = "PHILIPS",
  VIEWSONIC = "VIEWSONIC",
  EIZO = "EIZO",
  CORSAIR = "CORSAIR",
  LDLC = "LDLC",
  XIAOMI = "XIAOMI",
  APPLE = "APPLE",
  GARMIN = "GARMIN",
  HUAWEI = "HUAWEI",
  AMAZFIT = "AMAZFIT",
  WITHINGS = "WITHINGS",
  GOOGLE = "GOOGLE",
  POLAR = "POLAR",
  SUUNTO = "SUUNTO",
  COROS = "COROS",
  FITBIT = "FITBIT",
  MOTOROLA = "MOTOROLA",
  ONEPLUS = "ONEPLUS",
  OPPO = "OPPO",
  HONOR = "HONOR",
  NOTHING = "NOTHING",
  SONY = "SONY",
  CROSSCALL = "CROSSCALL",
  REALME = "REALME",
  FAIRPHONE = "FAIRPHONE",
  NOKIA = "NOKIA",
}
