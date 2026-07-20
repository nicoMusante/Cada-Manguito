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

export const THEMES: Record<"light" | "dark", Theme> = {
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
};

export type ThemeName = keyof typeof THEMES;
