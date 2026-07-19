"use client";

import { TrendingDown, TrendingUp, HandCoins } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { categories, movimientos, ingresos, gastos, meDeben, yoDebo, fmt, fmtShort } from "@/lib/mockData";

export function ResumenView({ t }: { t: Theme }) {
  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-5 lg:mt-6">
        <p className="text-[12px] lg:text-[13px]" style={{ color: t.textSecondary }}>Disponible este mes</p>
        <p className="text-[34px] lg:text-[40px] font-bold mt-1" style={{ color: t.textPrimary }}>
          {fmt(ingresos - gastos)}
        </p>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar px-5 lg:px-0 lg:flex-wrap">
        {categories.map((c) => (
          <div
            key={c.name}
            className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-white"
            style={{ backgroundColor: c.color }}
          >
            <c.icon size={13} />
            <span className="text-[11.5px]">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="px-5 lg:px-0 mt-6 grid grid-cols-2 lg:grid-cols-3 gap-2.5 lg:gap-4">
        <div className="rounded-2xl p-3 lg:p-5" style={{ backgroundColor: t.gastoCard }}>
          <TrendingDown size={15} className="lg:w-[18px] lg:h-[18px]" style={{ color: t.gastoAccent }} />
          <p className="text-[10px] lg:text-[12px] mt-1.5" style={{ color: t.gastoSub }}>Gastado</p>
          <p className="text-[15px] lg:text-[22px] font-bold" style={{ color: t.gastoValue }}>
            <span className="lg:hidden">{fmtShort(gastos)}</span>
            <span className="hidden lg:inline">{fmt(gastos)}</span>
          </p>
        </div>
        <div className="rounded-2xl p-3 lg:p-5" style={{ backgroundColor: t.ingresoCard }}>
          <TrendingUp size={15} className="lg:w-[18px] lg:h-[18px]" style={{ color: t.ingresoAccent }} />
          <p className="text-[10px] lg:text-[12px] mt-1.5" style={{ color: t.ingresoSub }}>Ingresado</p>
          <p className="text-[15px] lg:text-[22px] font-bold" style={{ color: t.ingresoValue }}>
            <span className="lg:hidden">{fmtShort(ingresos)}</span>
            <span className="hidden lg:inline">{fmt(ingresos)}</span>
          </p>
        </div>

        <div
          className="col-span-2 lg:col-span-1 rounded-2xl overflow-hidden flex"
          style={{ backgroundColor: t.debenCard }}
        >
          <div className="flex-1 p-3.5 lg:p-5 flex items-center">
            <div>
              <div className="flex items-center gap-1.5">
                <HandCoins size={14} style={{ color: t.debenAccent }} />
                <p className="text-[11px] lg:text-[12px]" style={{ color: t.debenSub }}>Te deben</p>
              </div>
              <p className="text-[18px] lg:text-[20px] font-bold mt-1" style={{ color: t.debenValue }}>
                {fmt(meDeben)}
              </p>
            </div>
          </div>
          <div className="w-px my-3" style={{ backgroundColor: t.deboAccent + "35" }} />
          <div className="flex-1 p-3.5 lg:p-5 flex items-center">
            <div>
              <div className="flex items-center gap-1.5">
                <HandCoins size={14} style={{ color: t.deboAccent, transform: "scaleX(-1)" }} />
                <p className="text-[11px] lg:text-[12px]" style={{ color: t.gastoSub }}>Debés</p>
              </div>
              <p className="text-[18px] lg:text-[20px] font-bold mt-1" style={{ color: t.gastoValue }}>
                {fmt(yoDebo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-0 mt-7">
        <p className="text-[12.5px] lg:text-[14px] font-semibold mb-2" style={{ color: t.textPrimary }}>
          Actividad
        </p>
        <div
          className="space-y-1 lg:rounded-2xl lg:p-2"
          style={{ backgroundColor: "transparent" }}
        >
          <div className="lg:rounded-2xl lg:p-3" style={{ backgroundColor: "transparent" }}>
            {movimientos.slice().reverse().slice(0, 5).map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 lg:px-2 border-b last:border-0"
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
                  <p className="text-[10.5px]" style={{ color: t.textSecondary }}>{m.fecha}</p>
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
      </div>
    </div>
  );
}
