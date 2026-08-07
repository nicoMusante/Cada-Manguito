import { Wallet, LucideIcon } from "lucide-react";
import { ICONS } from "./icons";
import { parseFechaLocal } from "./periodo";
import type { Cotizacion } from "./dolar";

// Forma en la que llegan las filas desde GET /api/categorias
export type CategoriaRow = {
  id: number;
  nombre: string;
  tipo: "INGRESO" | "GASTO";
  color_hex: string | null;
  icono: string | null;
};

export type CategoriaConId = {
  id: number;
  name: string;
  tipo: "INGRESO" | "GASTO";
  color: string;
  icon: LucideIcon;
};

export function mapCategoria(row: CategoriaRow): CategoriaConId {
  return {
    id: row.id,
    name: row.nombre,
    tipo: row.tipo,
    color: row.color_hex || "#8A6D3B",
    icon: (row.icono && ICONS[row.icono]) || Wallet,
  };
}

export type Movimiento = {
  id: number;
  categoriaId: number | null;
  desc: string;
  cat: string;
  monto: number;
  moneda: "ARS" | "USD";
  montoOriginal: number | null; // monto tal cual se tipeó, sólo cuando moneda === "USD"
  tipo: "in" | "out";
  fecha: string;
  fechaISO: string;
  icon: LucideIcon;
};

// Forma en la que llegan las filas desde GET /api/movimientos (vista v_movimientos)
export type MovimientoRow = {
  id: number;
  categoria_id: number | null;
  descripcion: string | null;
  categoria: string | null;
  tipo: "INGRESO" | "GASTO";
  color_hex: string | null;
  icono: string | null;
  monto: string; // numeric de Postgres llega como string
  moneda: "ARS" | "USD";
  monto_original: string | null;
  fecha: string; // fecha llega como string ISO
};

// nombre fijo que se muestra cuando un movimiento no tiene categoria_id —
// se exporta para que los componentes puedan detectar este caso puntual
// (por ejemplo, para darle un estilo distinto al de una categoría real)
export const SIN_CATEGORIA = "Sin categoría";

export function mapMovimiento(row: MovimientoRow): Movimiento {
  const monto = Number(row.monto);
  return {
    id: row.id,
    categoriaId: row.categoria_id,
    desc: row.descripcion ?? "",
    cat: row.categoria ?? SIN_CATEGORIA,
    monto: row.tipo === "GASTO" ? -monto : monto,
    moneda: row.moneda,
    montoOriginal: row.monto_original !== null ? Number(row.monto_original) : null,
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

// para movimientos cargados en USD, el equivalente en pesos ya no es fijo:
// se recalcula en vivo con la cotización actual (así, al cambiar el tipo de
// dólar en Ajustes, sólo se mueven los montos de lo que se cargó en dólares
// — lo cargado en pesos es plata ya gastada/cobrada y no varía). Si todavía
// no cargó la cotización, usa el monto en pesos que quedó guardado al cargar
// el movimiento, como valor de referencia mientras tanto.
export function montoEfectivoArs(m: Movimiento, cotizacion: Cotizacion | null): number {
  if (m.moneda === "USD" && m.montoOriginal != null && cotizacion?.venta) {
    const equivalente = m.montoOriginal * cotizacion.venta;
    return m.tipo === "out" ? -equivalente : equivalente;
  }
  return m.monto;
}

export function computeTotals(movimientos: Movimiento[], cotizacion: Cotizacion | null = null) {
  const ingresos = movimientos.filter((m) => m.tipo === "in").reduce((a, b) => a + montoEfectivoArs(b, cotizacion), 0);
  const gastos = Math.abs(movimientos.filter((m) => m.tipo === "out").reduce((a, b) => a + montoEfectivoArs(b, cotizacion), 0));
  return { ingresos, gastos };
}

export const fmt = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
