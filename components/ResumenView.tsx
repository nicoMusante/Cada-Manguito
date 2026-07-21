"use client";

import { TrendingDown, TrendingUp, Clock, Plus } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { computeTotals, fmt, fmtShort, type Movimiento, type CategoriaConId } from "@/lib/mockData";
import { MovimientoItem } from "@/components/MovimientoItem";

export function ResumenView({
  t, movimientos, loading, categorias, meDeben, yoDebo, onSelectMovimiento, onAddCategoria,
}: {
  t: Theme;
  movimientos: Movimiento[];
  loading: boolean;
  categorias: CategoriaConId[];
  meDeben: number;
  yoDebo: number;
  onSelectMovimiento: (m: Movimiento) => void;
  onAddCategoria: () => void;
}) {
  const { ingresos, gastos } = computeTotals(movimientos);

  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-5 lg:mt-6">
        <p className="text-[12px] lg:text-[13px]" style={{ color: t.textSecondary }}>Disponible este mes</p>
        <p className="text-[34px] lg:text-[40px] font-bold mt-1" style={{ color: t.textPrimary }}>
          {fmt(ingresos - gastos)}
        </p>
      </div>

      <div data-swipe-ignore className="mt-5 flex gap-2 overflow-x-auto no-scrollbar px-5 lg:px-0 lg:flex-wrap">
        {categorias.map((c) => (
          <div key={c.id} className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-white" style={{ backgroundColor: c.color }}>
            <c.icon size={13} />
            <span className="text-[11.5px]">{c.name}</span>
          </div>
        ))}
        <button
          onClick={onAddCategoria}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border border-dashed"
          style={{ borderColor: t.textSecondary, color: t.textSecondary }}
        >
          <Plus size={13} />
          <span className="text-[11.5px]">Categoría</span>
        </button>
      </div>

      <div className="px-5 lg:px-0 mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
        <div className="rounded-2xl p-3.5 lg:p-5" style={{ backgroundColor: t.gastoCard }}>
          <TrendingDown size={16} className="lg:w-[18px] lg:h-[18px]" style={{ color: t.gastoAccent }} />
          <p className="text-[10.5px] lg:text-[12px] mt-2" style={{ color: t.gastoSub }}>Gastado</p>
          <p className="text-[16px] lg:text-[21px] font-bold mt-0.5" style={{ color: t.gastoValue }}>
            <span className="lg:hidden">{fmtShort(gastos)}</span>
            <span className="hidden lg:inline">{fmt(gastos)}</span>
          </p>
        </div>
        <div className="rounded-2xl p-3.5 lg:p-5" style={{ backgroundColor: t.ingresoCard }}>
          <TrendingUp size={16} className="lg:w-[18px] lg:h-[18px]" style={{ color: t.ingresoAccent }} />
          <p className="text-[10.5px] lg:text-[12px] mt-2" style={{ color: t.ingresoSub }}>Ingresado</p>
          <p className="text-[16px] lg:text-[21px] font-bold mt-0.5" style={{ color: t.ingresoValue }}>
            <span className="lg:hidden">{fmtShort(ingresos)}</span>
            <span className="hidden lg:inline">{fmt(ingresos)}</span>
          </p>
        </div>

        <div
          className="rounded-2xl p-2.5 lg:p-3.5 border flex flex-col justify-center"
          style={{ borderColor: t.gastoAccent + "55", backgroundColor: t.gastoCard + "70", borderStyle: "dashed" }}
        >
          <div className="flex items-center gap-1.5">
            <Clock size={12} style={{ color: t.gastoAccent }} />
            <p className="text-[9.5px] lg:text-[11px]" style={{ color: t.gastoAccent }}>Debés</p>
          </div>
          <p className="text-[13px] lg:text-[15px] font-bold mt-0.5" style={{ color: t.gastoAccent }}>{fmtShort(yoDebo)}</p>
        </div>
        <div
          className="rounded-2xl p-2.5 lg:p-3.5 border flex flex-col justify-center"
          style={{ borderColor: t.ingresoAccent + "55", backgroundColor: t.ingresoCard + "70", borderStyle: "dashed" }}
        >
          <div className="flex items-center gap-1.5">
            <Clock size={12} style={{ color: t.ingresoAccent }} />
            <p className="text-[9.5px] lg:text-[11px]" style={{ color: t.ingresoAccent }}>Te deben</p>
          </div>
          <p className="text-[13px] lg:text-[15px] font-bold mt-0.5" style={{ color: t.ingresoAccent }}>{fmtShort(meDeben)}</p>
        </div>
      </div>

      <div className="px-5 lg:px-0 mt-7">
        <p className="text-[12.5px] lg:text-[14px] font-semibold mb-2" style={{ color: t.textPrimary }}>Actividad</p>
        {loading ? (
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>Cargando movimientos...</p>
        ) : movimientos.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>Todavía no cargaste ningún movimiento.</p>
        ) : (
          <div>
            {movimientos.slice(0, 5).map((m) => (
              <MovimientoItem key={m.id} t={t} m={m} subtitle={m.fecha} onEdit={() => onSelectMovimiento(m)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
