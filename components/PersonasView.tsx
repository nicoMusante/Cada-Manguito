"use client";

import { HandCoins } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { personas, fmt } from "@/lib/mockData";

export function PersonasView({ t }: { t: Theme }) {
  return (
    <div className="pb-4 lg:pb-0">
      <p className="px-5 lg:px-0 mt-1 lg:mt-6 text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>
        Balance neto por persona
      </p>

      <div className="px-5 lg:px-0 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
        {personas.map((p) => {
          const teDeben = p.neto > 0;
          const accent = teDeben ? t.debenAccent : t.deboAccent;
          const value = teDeben ? t.debenValue : t.gastoValue;
          const sub = teDeben ? t.debenSub : t.gastoSub;
          const cardBg = teDeben ? t.debenCard : t.gastoCard;
          return (
            <div key={p.nombre} className="rounded-2xl p-3.5 lg:p-4" style={{ backgroundColor: cardBg }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full text-white flex items-center justify-center text-[12px] font-semibold shrink-0" style={{ backgroundColor: accent }}>
                  {p.nombre[0]}
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-medium" style={{ color: value }}>{p.nombre}</p>
                  <p className="text-[10.5px]" style={{ color: sub }}>{teDeben ? "te debe" : "le debés"}</p>
                </div>
                <p className="text-[15px] font-bold" style={{ color: value }}>
                  {teDeben ? "+" : "-"}{fmt(Math.abs(p.neto))}
                </p>
              </div>
              <p className="text-[10px] mt-2 pl-11.5 leading-snug" style={{ color: sub }}>{p.detalle}</p>
            </div>
          );
        })}
      </div>

      {personas.length === 0 && (
        <div className="px-5 lg:px-0 mt-8 flex flex-col items-center text-center gap-2">
          <HandCoins size={22} style={{ color: t.textSecondary }} />
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>No tenés deudas pendientes con nadie.</p>
        </div>
      )}
    </div>
  );
}
