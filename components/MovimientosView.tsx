"use client";

import type { Theme } from "@/lib/theme";
import { type Movimiento } from "@/lib/mockData";
import { MovimientoItem } from "@/components/MovimientoItem";

export function MovimientosView({
  t, movimientos, loading, onSelectMovimiento,
}: { t: Theme; movimientos: Movimiento[]; loading: boolean; onSelectMovimiento: (m: Movimiento) => void }) {
  const grouped = movimientos.reduce<Record<string, Movimiento[]>>((acc, m) => {
    acc[m.fecha] = acc[m.fecha] || [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  return (
    <div className="pb-4 lg:pb-0">
      <p className="px-5 lg:px-0 mt-1 lg:mt-6 text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>
        {movimientos.length} movimientos
      </p>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px]" style={{ color: t.textSecondary }}>Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px]" style={{ color: t.textSecondary }}>
          Todavía no cargaste ningún movimiento.
        </p>
      ) : (
        <div className="lg:mt-4">
          {Object.entries(grouped).map(([fecha, items]) => (
            <div key={fecha} className="mt-5 lg:mt-4 first:lg:mt-0">
              <p className="px-5 lg:px-2 text-[10.5px] tracking-[0.1em] uppercase mb-2" style={{ color: t.textSecondary }}>{fecha}</p>
              <div className="px-5 lg:px-2 space-y-1">
                {items.map((m) => (
                  <MovimientoItem key={m.id} t={t} m={m} subtitle={m.cat} onClick={() => onSelectMovimiento(m)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
