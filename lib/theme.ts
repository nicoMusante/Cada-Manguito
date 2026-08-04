export type ThemeName =
  | "light" | "dark"
  | "yellow" | "tabaco"
  | "navy" | "celeste"
  | "medianoche" | "glaciar"
  | "bosque" | "menta"
  | "violeta" | "lavanda"
  | "ambar" | "champan"
  | "vino" | "rosado";

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Terracota",
  dark: "Café",
  yellow: "Miel",
  tabaco: "Tabaco",
  navy: "Clásico azul",
  celeste: "Celeste",
  medianoche: "Medianoche",
  glaciar: "Glaciar",
  bosque: "Bosque",
  menta: "Menta",
  violeta: "Violeta",
  lavanda: "Lavanda",
  ambar: "Ámbar",
  champan: "Champán",
  vino: "Vino",
  rosado: "Rosado",
};

export const THEME_MODE: Record<ThemeName, "claro" | "oscuro"> = {
  light: "claro",
  dark: "oscuro",
  yellow: "claro",
  tabaco: "oscuro",
  navy: "oscuro",
  celeste: "claro",
  medianoche: "oscuro",
  glaciar: "claro",
  bosque: "oscuro",
  menta: "claro",
  violeta: "oscuro",
  lavanda: "claro",
  ambar: "oscuro",
  champan: "claro",
  vino: "oscuro",
  rosado: "claro",
};

// pareja claro/oscuro de cada tema: la barra de sol/luna cambia de uno a
// otro sin tocar la gama de colores elegida (ej. Café ↔ Terracota)
export const THEME_PAIR: Record<ThemeName, ThemeName> = {
  light: "dark",
  dark: "light",
  yellow: "tabaco",
  tabaco: "yellow",
  navy: "celeste",
  celeste: "navy",
  medianoche: "glaciar",
  glaciar: "medianoche",
  bosque: "menta",
  menta: "bosque",
  violeta: "lavanda",
  lavanda: "violeta",
  ambar: "champan",
  champan: "ambar",
  vino: "rosado",
  rosado: "vino",
};

// familias de color (gama), cada una con su variante clara y oscura — es lo
// que se elige desde Ajustes; el modo claro/oscuro se elige aparte
export const THEME_FAMILIES: { claro: ThemeName; oscuro: ThemeName }[] = [
  { claro: "light", oscuro: "dark" },
  { claro: "yellow", oscuro: "tabaco" },
  { claro: "celeste", oscuro: "navy" },
  { claro: "glaciar", oscuro: "medianoche" },
  { claro: "menta", oscuro: "bosque" },
  { claro: "lavanda", oscuro: "violeta" },
  { claro: "champan", oscuro: "ambar" },
  { claro: "rosado", oscuro: "vino" },
];

// colores fijos para la vista previa de cada tema en Ajustes — se muestran
// aunque ese tema no esté activo, por eso no pueden salir de las variables
// CSS (que solo describen el tema actual)
export const THEME_SWATCHES: Record<ThemeName, { bg: string; ring: string; accent: string }> = {
  light: { bg: "#FBF4EC", ring: "#F0E2CF", accent: "#B8562F" },
  dark: { bg: "#221811", ring: "#382A1D", accent: "#E0793F" },
  yellow: { bg: "#FFF8E1", ring: "#F5E7A8", accent: "#D4A017" },
  tabaco: { bg: "#19130b", ring: "#3c3220", accent: "#e5a82e" },
  navy: { bg: "#0F1B2D", ring: "#1F3350", accent: "#3B6EA5" },
  celeste: { bg: "#dae7f1", ring: "#caddec", accent: "#306da6" },
  medianoche: { bg: "#13151B", ring: "#242932", accent: "#2BB3F3" },
  glaciar: { bg: "#dfebf1", ring: "#cde0ea", accent: "#1982b3" },
  bosque: { bg: "#111C18", ring: "#21312A", accent: "#EEA62B" },
  menta: { bg: "#e0f0e8", ring: "#cfe8db", accent: "#b37519" },
  violeta: { bg: "#181320", ring: "#2C2438", accent: "#A05AE2" },
  lavanda: { bg: "#eae3f2", ring: "#ddd2e9", accent: "#7d37be" },
  ambar: { bg: "#1F1B0F", ring: "#37311F", accent: "#F4C025" },
  champan: { bg: "#f4eddd", ring: "#ebe3cb", accent: "#b68920" },
  vino: { bg: "#211214", ring: "#392327", accent: "#E4446C" },
  rosado: { bg: "#f5e5e8", ring: "#ebd1d6", accent: "#cc3359" },
};
