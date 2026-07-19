import { Dumbbell, Home as HomeIcon, Zap, Coffee, ShoppingBag, Wallet, LucideIcon } from "lucide-react";

export type Categoria = { name: string; icon: LucideIcon; color: string };

export const categories: Categoria[] = [
  { name: "Padel", icon: Dumbbell, color: "#2F6F5E" },
  { name: "Casa", icon: HomeIcon, color: "#B8562F" },
  { name: "Servicios", icon: Zap, color: "#8A6D3B" },
  { name: "Comida", icon: Coffee, color: "#4A5D6B" },
  { name: "Compras", icon: ShoppingBag, color: "#6B4A6B" },
];

export type Movimiento = {
  desc: string;
  cat: string;
  monto: number;
  tipo: "in" | "out";
  fecha: string;
  icon: LucideIcon;
};

export const movimientos: Movimiento[] = [
  { desc: "Sueldo", cat: "Ingreso", monto: 1850000, tipo: "in", fecha: "1 Jul", icon: Wallet },
  { desc: "Palas y overgrips", cat: "Padel", monto: -64000, tipo: "out", fecha: "2 Jul", icon: Dumbbell },
  { desc: "Alquiler cancha", cat: "Padel", monto: -18000, tipo: "out", fecha: "3 Jul", icon: Dumbbell },
  { desc: "Supermercado", cat: "Comida", monto: -47500, tipo: "out", fecha: "3 Jul", icon: Coffee },
  { desc: "Luz", cat: "Servicios", monto: -22100, tipo: "out", fecha: "4 Jul", icon: Zap },
  { desc: "Freelance GIS", cat: "Ingreso", monto: 210000, tipo: "in", fecha: "5 Jul", icon: Wallet },
];

export type Persona = { nombre: string; neto: number; detalle: string };

export const personas: Persona[] = [
  { nombre: "Fede", neto: 20000, detalle: "Te debe $20.000" },
  { nombre: "Cami", neto: 18000, detalle: "Te debe $18.000" },
  { nombre: "Male", neto: -5000, detalle: "Le debés $5.000 (te debía $17.000, le debías $22.000)" },
];

export const ingresos = movimientos.filter((m) => m.tipo === "in").reduce((a, b) => a + b.monto, 0);
export const gastos = Math.abs(movimientos.filter((m) => m.tipo === "out").reduce((a, b) => a + b.monto, 0));
export const meDeben = personas.filter((p) => p.neto > 0).reduce((a, p) => a + p.neto, 0);
export const yoDebo = Math.abs(personas.filter((p) => p.neto < 0).reduce((a, p) => a + p.neto, 0));

export const fmt = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const fmtShort = (n: number) => "$" + (Math.abs(n) / 1000).toFixed(0) + "k";
