export interface Theme {
  bg: string;
  outerBg: string;
  surfaceCard: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  surface: string;
  avatarBg: string;
  navBg: string;
  gastoCard: string; gastoAccent: string; gastoSub: string; gastoValue: string;
  ingresoCard: string; ingresoAccent: string; ingresoSub: string; ingresoValue: string;
  debenCard: string; debenAccent: string; debenSub: string; debenValue: string;
  deboAccent: string;
}

export const THEMES: Record<"light" | "dark" | "yellow" | "navy", Theme> = {
  light: {
    bg: "#FBF4EC",
    outerBg: "#EDE9DE",
    surfaceCard: "#FFFFFF",
    textPrimary: "#3A2A1E",
    textSecondary: "#A8927D",
    divider: "#F0E2CF",
    surface: "#F3E9DC",
    avatarBg: "#B8562F",
    navBg: "rgba(251,244,236,0.95)",
    gastoCard: "#F3DFCB", gastoAccent: "#B8562F", gastoSub: "#8A6A4E", gastoValue: "#3A2A1E",
    ingresoCard: "#E3E8D3", ingresoAccent: "#5C7A3E", ingresoSub: "#5C6E45", ingresoValue: "#33421F",
    debenCard: "#DCE6EA", debenAccent: "#3E6B7A", debenSub: "#3E5F6B", debenValue: "#1F3A42",
    deboAccent: "#B8562F",
  },
  dark: {
    bg: "#221811",
    outerBg: "#17110B",
    surfaceCard: "#2B1F16",
    textPrimary: "#F5EAD9",
    textSecondary: "#B39A80",
    divider: "#382A1D",
    surface: "#33261A",
    avatarBg: "#E0793F",
    navBg: "rgba(34,24,17,0.95)",
    gastoCard: "#3D2A1B", gastoAccent: "#E0793F", gastoSub: "#C9A98A", gastoValue: "#F5EAD9",
    ingresoCard: "#243021", ingresoAccent: "#9FC47A", ingresoSub: "#B9CDA0", ingresoValue: "#EAF3E0",
    debenCard: "#1E2C30", debenAccent: "#7BC2D6", debenSub: "#A9C8D0", debenValue: "#E6F4F7",
    deboAccent: "#E0793F",
  },
  yellow: {
    bg: "#FFF8E1",
    outerBg: "#FBEFC4",
    surfaceCard: "#FFFFFF",
    textPrimary: "#4A3B0A",
    textSecondary: "#9C8A4E",
    divider: "#F5E7A8",
    surface: "#FBEFC4",
    avatarBg: "#D4A017",
    navBg: "rgba(255,248,225,0.95)",
    gastoCard: "#F5DFA0", gastoAccent: "#B8860B", gastoSub: "#8A6F2E", gastoValue: "#4A3B0A",
    ingresoCard: "#E8EFC0", ingresoAccent: "#6B8E23", ingresoSub: "#5C6E2E", ingresoValue: "#33421A",
    debenCard: "#F0E4B8", debenAccent: "#C9932F", debenSub: "#9C7A2E", debenValue: "#4A3B0A",
    deboAccent: "#B8562F",
  },
  navy: {
    bg: "#0F1B2D",
    outerBg: "#0A1420",
    surfaceCard: "#16263D",
    textPrimary: "#E8EEF5",
    textSecondary: "#8FA3BD",
    divider: "#1F3350",
    surface: "#1B2E48",
    avatarBg: "#3B6EA5",
    navBg: "rgba(15,27,45,0.95)",
    gastoCard: "#2A2038", gastoAccent: "#D97E5B", gastoSub: "#C9A98A", gastoValue: "#E8EEF5",
    ingresoCard: "#1A3328", ingresoAccent: "#6FBF8B", ingresoSub: "#A9CDB9", ingresoValue: "#EAF3E8",
    debenCard: "#1B2E48", debenAccent: "#5DA3D9", debenSub: "#A9C8D0", debenValue: "#E6F4F7",
    deboAccent: "#D97E5B",
  },
};

export type ThemeName = keyof typeof THEMES;

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Claro",
  dark: "Oscuro",
  yellow: "Amarillo",
  navy: "Clásico azul",
};
