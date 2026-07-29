"use client";

import { Trash2, Plus } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { fmt, type GastoFijo } from "@/lib/mockData";

export function GastosFijosView({
  t, gastosFijos, loading, onEliminar, onNuevo,
}: {
  t: Theme;
  gastosFijos: GastoFijo[];
  loading: boolean;
  onEliminar: (id: number) => void;
  onNuevo: () => void;
}) {
  const total = gastosFijos.reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-1 lg:mt-6 flex items-center justify-between">
        <p className="text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>Total fijo por mes</p>
        {gastosFijos.length > 0 && (
          <p className="text-[13px] font-semibold" style={{ color: t.gastoAccent }}>{fmt(total)}</p>
        )}
      </div>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px]" style={{ color: t.textSecondary }}>Cargando...</p>
      ) : gastosFijos.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px]" style={{ color: t.textSecondary }}>
          Todavía no cargaste ningún gasto fijo o recurrente.
        </p>
      ) : (
        <div className="px-5 lg:px-0 mt-4 space-y-1.5">
          {gastosFijos.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
              style={{ backgroundColor: t.surface }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: g.color + "22" }}>
                <g.icon size={15} style={{ color: g.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: t.textPrimary }}>{g.desc}</p>
                <p className="text-[11px]" style={{ color: t.textSecondary }}>{g.cat} · día {g.diaMes}</p>
              </div>
              <p className="text-[13px] font-semibold shrink-0" style={{ color: t.textPrimary }}>{fmt(g.monto)}</p>
              <button onClick={() => onEliminar(g.id)} className="shrink-0" aria-label="Eliminar">
                <Trash2 size={13} style={{ color: t.textSecondary }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 lg:px-0 mt-5">
        <button
          onClick={onNuevo}
          className="w-full flex items-center justify-center gap-1.5 rounded-2xl py-3 border border-dashed text-[13px] font-medium"
          style={{ borderColor: t.textSecondary, color: t.textSecondary }}
        >
          <Plus size={14} />
          Nuevo gasto fijo
        </button>
      </div>
    </div>
  );
}
