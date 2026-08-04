"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Clock, Plus, X, Check } from "lucide-react";
import { computeTotals, fmt, type Movimiento, type CategoriaConId } from "@/lib/mockData";
import { formatUSD, type Cotizacion } from "@/lib/dolar";
import { MovimientoItem } from "@/components/MovimientoItem";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { Card, CardContent } from "@/components/ui/card";

// cuánto tiempo queda "armada" la confirmación de borrado antes de cancelarse
// sola, para que un toque accidental en la x no deje el chip pidiendo
// confirmación para siempre
const MS_AUTOCANCELAR_BORRADO = 4000;

export function ResumenView({
  movimientos, loading, categorias, meDeben, yoDebo, onSelectMovimiento, onAddCategoria, onEliminarCategoria,
  periodoLabel, onMesAnterior, onMesSiguiente, esMesActual, cotizacion,
}: {
  movimientos: Movimiento[];
  loading: boolean;
  categorias: CategoriaConId[];
  meDeben: number;
  yoDebo: number;
  onSelectMovimiento: (m: Movimiento) => void;
  onAddCategoria: () => void;
  onEliminarCategoria: (id: number) => void;
  periodoLabel: string;
  onMesAnterior: () => void;
  onMesSiguiente: () => void;
  esMesActual: boolean;
  cotizacion?: Cotizacion | null;
}) {
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<number>>(new Set());
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<number | null>(null);

  // si no se confirma en unos segundos, se cancela sola — así un toque
  // accidental en la x no deja el chip trabado pidiendo confirmación
  useEffect(() => {
    if (confirmarEliminarId === null) return;
    const timer = setTimeout(() => setConfirmarEliminarId(null), MS_AUTOCANCELAR_BORRADO);
    return () => clearTimeout(timer);
  }, [confirmarEliminarId]);

  function toggleFiltroCategoria(id: number) {
    setCategoriasFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmarEliminarCategoria(id: number) {
    onEliminarCategoria(id);
    setConfirmarEliminarId(null);
    setCategoriasFiltro((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const hayFiltro = categoriasFiltro.size > 0;
  const movimientosFiltrados = hayFiltro
    ? movimientos.filter((m) => categoriasFiltro.has(m.categoriaId))
    : movimientos;
  const movimientosAMostrar = hayFiltro ? movimientosFiltrados : movimientosFiltrados.slice(0, 5);

  // los totales de arriba reflejan el filtro de categorías, no solo la lista de abajo
  const { ingresos, gastos } = computeTotals(movimientosFiltrados);

  return (
    <div className="pb-4 lg:pb-0">
      <MonthSwitcher label={periodoLabel} onAnterior={onMesAnterior} onSiguiente={onMesSiguiente} esMesActual={esMesActual} />

      {/* en mobile estos 3 bloques se apilan en orden normal (balance, categorías,
          stats); en desktop se reacomodan con lg:order sin tocar el DOM, así el
          balance queda al lado de las stat cards en vez de arriba de todo */}
      <div className="lg:grid lg:grid-cols-6 lg:gap-4 lg:items-stretch lg:mt-6">
      <div className="px-5 lg:px-0 mt-5 lg:mt-0 lg:order-1 lg:col-span-2 lg:row-span-2">
        <Card className="border-none shadow-sm bg-secondary lg:h-full">
          <CardContent className="p-4 lg:p-6 lg:h-full lg:flex lg:flex-col lg:justify-center">
            <p className="text-[12px] lg:text-[13px] text-muted-foreground">Balance del mes</p>
            <p className="text-[34px] lg:text-[40px] font-bold mt-1 text-foreground tabular-nums">
              {fmt(ingresos - gastos)}
            </p>
            {formatUSD(ingresos - gastos, cotizacion ?? null) && (
              <p className="text-[12px] text-muted-foreground tabular-nums">{formatUSD(ingresos - gastos, cotizacion ?? null)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div
        data-swipe-ignore
        className="mt-5 flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar px-5 lg:px-0 lg:flex-wrap lg:order-3 lg:col-span-6 lg:mt-4"
      >
        {categorias.map((c) => {
          const seleccionada = categoriasFiltro.has(c.id);
          const confirmando = confirmarEliminarId === c.id;
          return (
            <div
              key={c.id}
              className="shrink-0 flex items-center gap-1.5 rounded-full pl-3.5 pr-2 py-2 text-white transition"
              style={{
                backgroundColor: confirmando ? "hsl(var(--expense))" : c.color,
                opacity: hayFiltro && !seleccionada && !confirmando ? 0.45 : 1,
                boxShadow: seleccionada && !confirmando ? "0 0 0 2px rgba(255,255,255,0.85) inset" : "none",
              }}
            >
              <button
                type="button"
                onClick={() => toggleFiltroCategoria(c.id)}
                disabled={confirmando}
                aria-pressed={seleccionada}
                aria-label={`Filtrar por ${c.name}`}
                className="flex items-center gap-1.5"
              >
                <c.icon size={13} />
                <span className="text-[11.5px]">{confirmando ? `¿Eliminar ${c.name}?` : c.name}</span>
              </button>
              {confirmando ? (
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => confirmarEliminarCategoria(c.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                    aria-label={`Confirmar eliminar categoría ${c.name}`}
                  >
                    <Check size={9} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminarId(null)}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                    aria-label="Cancelar"
                  >
                    <X size={9} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarEliminarId(c.id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
                  aria-label={`Eliminar categoría ${c.name}`}
                >
                  <X size={9} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAddCategoria}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border border-dashed border-muted-foreground/50 text-muted-foreground"
        >
          <Plus size={13} />
          <span className="text-[11.5px]">Categoría</span>
        </button>
      </div>

      <div className="px-5 lg:px-0 mt-6 lg:mt-0 grid grid-cols-2 lg:grid-cols-2 gap-2.5 lg:gap-3 lg:order-2 lg:col-span-4">
        <Card className="border-none shadow-sm bg-expense-soft">
          <CardContent className="p-3.5 lg:p-5">
            <TrendingDown size={16} className="lg:w-[18px] lg:h-[18px] text-expense" />
            <p className="text-[10.5px] lg:text-[12px] mt-2 text-expense/80">Gastado</p>
            <p className="text-[16px] lg:text-[21px] font-bold mt-0.5 text-expense tabular-nums">{fmt(gastos)}</p>
            {formatUSD(gastos, cotizacion ?? null) && (
              <p className="text-[10px] text-expense/70 tabular-nums">{formatUSD(gastos, cotizacion ?? null)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-income-soft">
          <CardContent className="p-3.5 lg:p-5">
            <TrendingUp size={16} className="lg:w-[18px] lg:h-[18px] text-income" />
            <p className="text-[10.5px] lg:text-[12px] mt-2 text-income/80">Ingresado</p>
            <p className="text-[16px] lg:text-[21px] font-bold mt-0.5 text-income tabular-nums">{fmt(ingresos)}</p>
            {formatUSD(ingresos, cotizacion ?? null) && (
              <p className="text-[10px] text-income/70 tabular-nums">{formatUSD(ingresos, cotizacion ?? null)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-expense/40 bg-expense-soft/60 shadow-none">
          <CardContent className="p-2.5 lg:p-3.5 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-expense" />
              <p className="text-[9.5px] lg:text-[11px] text-expense">Debés</p>
            </div>
            <p className="text-[13px] lg:text-[15px] font-bold mt-0.5 text-expense tabular-nums">{fmt(yoDebo)}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed border-income/40 bg-income-soft/60 shadow-none">
          <CardContent className="p-2.5 lg:p-3.5 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-income" />
              <p className="text-[9.5px] lg:text-[11px] text-income">Te deben</p>
            </div>
            <p className="text-[13px] lg:text-[15px] font-bold mt-0.5 text-income tabular-nums">{fmt(meDeben)}</p>
          </CardContent>
        </Card>
      </div>
      </div>

      <div className="px-5 lg:px-0 mt-7">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12.5px] lg:text-[14px] font-semibold text-foreground">Actividad</p>
          {hayFiltro && (
            <button
              type="button"
              onClick={() => setCategoriasFiltro(new Set())}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Limpiar filtro
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-[12.5px] text-muted-foreground">Cargando movimientos...</p>
        ) : movimientosAMostrar.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            {hayFiltro ? "No hay movimientos en esas categorías este mes." : "Todavía no cargaste ningún movimiento."}
          </p>
        ) : (
          <div>
            {movimientosAMostrar.map((m) => (
              <MovimientoItem key={m.id} m={m} subtitle={m.fecha} onEdit={() => onSelectMovimiento(m)} cotizacion={cotizacion} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
