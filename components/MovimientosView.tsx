"use client";

import type { Theme } from "@/lib/theme";
import { movimientos, fmt } from "@/lib/mockData";

export function MovimientosView({ t }: { t: Theme }) {
  const grouped = movimientos.reduce<Record<string, typeof movimientos>>((acc, m) => {
    acc[m.fecha] = acc[m.fecha] || [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  return (
    <div className="pb-4 lg:pb-0">
      <p className="px-5 lg:px-0 mt-1 lg:mt-6 text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>
        Julio 2026 · {movimientos.length} movimientos
      </p>

      <div className="lg:rounded-2xl lg:mt-4 lg:p-2" style={{ backgroundColor: "transparent" }}>
        {Object.entries(grouped).map(([fecha, items]) => (
          <div key={fecha} className="mt-5 lg:mt-4 first:lg:mt-0">
            <p
              className="px-5 lg:px-2 text-[10.5px] tracking-[0.1em] uppercase mb-2"
              style={{ color: t.textSecondary }}
            >
              {fecha}
            </p>
            <div className="px-5 lg:px-2 space-y-1">
              {items.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b last:border-0"
                  style={{ borderColor: t.divider }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: t.surface }}
                  >
                    <m.icon size={15} style={{ color: t.textPrimary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: t.textPrimary }}>{m.desc}</p>
                    <p className="text-[10.5px]" style={{ color: t.textSecondary }}>{m.cat}</p>
                  </div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: m.tipo === "in" ? t.ingresoAccent : t.textPrimary }}
                  >
                    {m.tipo === "in" ? "+" : "-"}{fmt(Math.abs(m.monto))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
