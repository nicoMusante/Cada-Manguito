export type ThemeName = "light" | "dark" | "yellow" | "navy" | "medianoche" | "bosque" | "violeta" | "ambar" | "vino";

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Terracota",
  dark: "Café",
  yellow: "Miel",
  navy: "Clásico azul",
  medianoche: "Medianoche",
  bosque: "Bosque",
  violeta: "Violeta",
  ambar: "Ámbar",
  vino: "Vino",
};

// colores fijos para la vista previa de cada tema en ThemeModal — se
// muestran aunque ese tema no esté activo, por eso no pueden salir de las
// variables CSS (que solo describen el tema actual)
export const THEME_SWATCHES: Record<ThemeName, { bg: string; ring: string; accent: string }> = {
  light: { bg: "#FBF4EC", ring: "#F0E2CF", accent: "#B8562F" },
  dark: { bg: "#221811", ring: "#382A1D", accent: "#E0793F" },
  yellow: { bg: "#FFF8E1", ring: "#F5E7A8", accent: "#D4A017" },
  navy: { bg: "#0F1B2D", ring: "#1F3350", accent: "#3B6EA5" },
  medianoche: { bg: "#13151B", ring: "#242932", accent: "#2BB3F3" },
  bosque: { bg: "#111C18", ring: "#21312A", accent: "#EEA62B" },
  violeta: { bg: "#181320", ring: "#2C2438", accent: "#A05AE2" },
  ambar: { bg: "#1F1B0F", ring: "#37311F", accent: "#F4C025" },
  vino: { bg: "#211214", ring: "#392327", accent: "#E4446C" },
};
