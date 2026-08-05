"use client";

import { Trash2, Plus } from "lucide-react";
import { fmt, type GastoFijo } from "@/lib/mockData";
import { formatUSD, type Cotizacion } from "@/lib/dolar";
import { Card, CardContent } from "@/components/ui/card";
import { periodoActual, formatPeriodoLabel } from "@/lib/periodo";

export function GastosFijosView({
  gastosFijos, loading, onEliminar, onNuevo, cotizacion,
}: {
  gastosFijos: GastoFijo[];
  loading: boolean;
  onEliminar: (id: number) => void;
  onNuevo: () => void;
  cotizacion?: Cotizacion | null;
}) {
  const total = gastosFijos.reduce((acc, g) => acc + g.monto, 0);

  function handleEliminar(g: GastoFijo) {
    if (confirm(`¿Eliminar el gasto fijo "${g.desc}"?`)) onEliminar(g.id);
  }

  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-1 lg:mt-6 flex items-center justify-between">
        <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">Total fijo por mes</p>
        {gastosFijos.length > 0 && (
          <div className="text-right">
            <p className="text-[13px] font-semibold text-expense tabular-nums">{fmt(total)}</p>
            {formatUSD(total, cotizacion ?? null) && (
              <p className="text-[10px] text-muted-foreground tabular-nums">{formatUSD(total, cotizacion ?? null)}</p>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">Cargando...</p>
      ) : gastosFijos.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">
          Todavía no cargaste ningún gasto fijo o recurrente.
        </p>
      ) : (
        <div className="px-5 lg:px-0 mt-4 space-y-1.5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
          {gastosFijos.map((g) => {
            const empiezaEnElFuturo = g.mesInicio > periodoActual();
            const cuotaActual = Math.min(g.cuotasGeneradas + 1, g.cuotasTotales ?? Infinity);
            return (
              <Card key={g.id} className="border-none shadow-sm bg-secondary">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: g.color + "22" }}>
                    <g.icon size={15} style={{ color: g.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate text-foreground">{g.desc}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.cat} · día {g.diaMes}
                      {g.cuotasTotales && ` · cuota ${cuotaActual}/${g.cuotasTotales}`}
                      {empiezaEnElFuturo && ` · desde ${formatPeriodoLabel(g.mesInicio)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-foreground tabular-nums">{fmt(g.monto)}</p>
                    {formatUSD(g.monto, cotizacion ?? null) && (
                      <p className="text-[9.5px] text-muted-foreground tabular-nums">{formatUSD(g.monto, cotizacion ?? null)}</p>
                    )}
                  </div>
                  <button onClick={() => handleEliminar(g)} className="shrink-0" aria-label="Eliminar">
                    <Trash2 size={13} className="text-muted-foreground" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="px-5 lg:px-0 mt-5">
        <button
          onClick={onNuevo}
          className="w-full flex items-center justify-center gap-1.5 rounded-2xl py-3 border border-dashed border-muted-foreground/50 text-[13px] font-medium text-muted-foreground"
        >
          <Plus size={14} />
          Nuevo gasto fijo
        </button>
      </div>
    </div>
  );
}
