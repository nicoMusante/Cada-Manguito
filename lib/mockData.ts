import { Dumbbell, Home as HomeIcon, Zap, Coffee, ShoppingBag, Wallet, LucideIcon } from "lucide-react";
import { ICONS } from "./icons";
import { parseFechaLocal } from "./periodo";

export type Categoria = { name: string; icon: LucideIcon; color: string };

// Forma en la que llegan las filas desde GET /api/categorias
export type CategoriaRow = {
  id: number;
  nombre: string;
  tipo: "INGRESO" | "GASTO";
  color_hex: string | null;
  icono: string | null;
};

export type CategoriaConId = Categoria & { id: number; tipo: "INGRESO" | "GASTO" };

export function mapCategoria(row: CategoriaRow): CategoriaConId {
  return {
    id: row.id,
    name: row.nombre,
    tipo: row.tipo,
    color: row.color_hex || "#8A6D3B",
    icon: (row.icono && ICONS[row.icono]) || Wallet,
  };
}

// Categorías: todavía sin endpoint propio, quedan fijas por ahora.
export const categories: Categoria[] = [
  { name: "Padel", icon: Dumbbell, color: "#2F6F5E" },
  { name: "Casa", icon: HomeIcon, color: "#B8562F" },
  { name: "Servicios", icon: Zap, color: "#8A6D3B" },
  { name: "Comida", icon: Coffee, color: "#4A5D6B" },
  { name: "Compras", icon: ShoppingBag, color: "#6B4A6B" },
];

export type Movimiento = {
  id: number;
  categoriaId: number;
  desc: string;
  cat: string;
  monto: number;
  tipo: "in" | "out";
  fecha: string;
  fechaISO: string;
  icon: LucideIcon;
};

// Forma en la que llegan las filas desde GET /api/movimientos (vista v_movimientos)
export type MovimientoRow = {
  id: number;
  categoria_id: number;
  descripcion: string;
  categoria: string;
  tipo: "INGRESO" | "GASTO";
  color_hex: string | null;
  icono: string | null;
  monto: string; // numeric de Postgres llega como string
  fecha: string; // fecha llega como string ISO
};

export function mapMovimiento(row: MovimientoRow): Movimiento {
  const monto = Number(row.monto);
  return {
    id: row.id,
    categoriaId: row.categoria_id,
    desc: row.descripcion,
    cat: row.categoria,
    monto: row.tipo === "GASTO" ? -monto : monto,
    tipo: row.tipo === "INGRESO" ? "in" : "out",
    fecha: parseFechaLocal(row.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
    fechaISO: row.fecha,
    icon: (row.icono && ICONS[row.icono]) || Wallet,
  };
}

// Forma en la que llegan las filas desde GET /api/gastos-fijos
export type GastoFijoRow = {
  id: number;
  categoria_id: number;
  descripcion: string;
  monto: string;
  dia_mes: number;
  mes_inicio: string;
  cuotas_totales: number | null;
  mes_fin: string | null;
  categoria: string;
  color_hex: string | null;
  icono: string | null;
  cuotas_generadas: number;
};

export type GastoFijo = {
  id: number;
  categoriaId: number;
  desc: string;
  cat: string;
  monto: number;
  diaMes: number;
  mesInicio: string;
  cuotasTotales: number | null;
  mesFin: string | null;
  cuotasGeneradas: number;
  color: string;
  icon: LucideIcon;
};

export function mapGastoFijo(row: GastoFijoRow): GastoFijo {
  return {
    id: row.id,
    categoriaId: row.categoria_id,
    desc: row.descripcion,
    cat: row.categoria,
    monto: Number(row.monto),
    diaMes: row.dia_mes,
    mesInicio: row.mes_inicio,
    cuotasTotales: row.cuotas_totales,
    mesFin: row.mes_fin,
    cuotasGeneradas: row.cuotas_generadas,
    color: row.color_hex || "#8A6D3B",
    icon: (row.icono && ICONS[row.icono]) || Wallet,
  };
}

export function computeTotals(movimientos: Movimiento[]) {
  const ingresos = movimientos.filter((m) => m.tipo === "in").reduce((a, b) => a + b.monto, 0);
  const gastos = Math.abs(movimientos.filter((m) => m.tipo === "out").reduce((a, b) => a + b.monto, 0));
  return { ingresos, gastos };
}

export type Persona = { nombre: string; neto: number; detalle: string };

// Personas: todavía sin endpoint propio, sigue siendo mock por ahora.
export const personas: Persona[] = [
  { nombre: "Fede", neto: 20000, detalle: "Te debe $20.000" },
  { nombre: "Cami", neto: 18000, detalle: "Te debe $18.000" },
  { nombre: "Male", neto: -5000, detalle: "Le debés $5.000 (te debía $17.000, le debías $22.000)" },
];

export const meDeben = personas.filter((p) => p.neto > 0).reduce((a, p) => a + p.neto, 0);
export const yoDebo = Math.abs(personas.filter((p) => p.neto < 0).reduce((a, p) => a + p.neto, 0));

export const fmt = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
