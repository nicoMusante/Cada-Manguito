"use client";

import type { Theme } from "@/lib/theme";
import { type Movimiento, fmt } from "@/lib/mockData";

export function MovimientoItem({
  t,
  m,
  subtitle,
  onClick,
}: {
  t: Theme;
  m: Movimiento;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 border-b last:border-0 text-left active:opacity-70 transition"
      style={{ borderColor: t.divider }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.surface }}>
        <m.icon size={15} style={{ color: t.textPrimary }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: t.textPrimary }}>{m.desc}</p>
        <p className="text-[10.5px]" style={{ color: t.textSecondary }}>{subtitle}</p>
      </div>
      <p className="text-[13px] font-semibold" style={{ color: m.tipo === "in" ? t.ingresoAccent : t.textPrimary }}>
        {m.tipo === "in" ? "+" : "-"}{fmt(Math.abs(m.monto))}
      </p>
    </button>
  );
}
