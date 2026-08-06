import {
  Dumbbell, Home as HomeIcon, Zap, Coffee, ShoppingBag, Wallet,
  Car, Heart, Plane, Gift, Book, Film, Smartphone, PawPrint,
  GraduationCap, Utensils, Bus, Music, Shirt, Gamepad2, HandCoins,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  "hand-coins": HandCoins,
  home: HomeIcon,
  zap: Zap,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  wallet: Wallet,
  car: Car,
  heart: Heart,
  plane: Plane,
  gift: Gift,
  book: Book,
  film: Film,
  smartphone: Smartphone,
  "paw-print": PawPrint,
  "graduation-cap": GraduationCap,
  utensils: Utensils,
  bus: Bus,
  music: Music,
  shirt: Shirt,
  gamepad: Gamepad2,
};

export const ICON_OPTIONS = Object.keys(ICONS);
