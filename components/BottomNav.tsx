"use client";

import { Wallet, List, Users, Repeat, PieChart } from "lucide-react";

export type TabId = "resumen" | "movimientos" | "personas" | "fijos" | "graficos";

export const TABS: { id: TabId; label: string; icon: typeof Wallet }[] = [
  { id: "resumen", label: "Resumen", icon: Wallet },
  { id: "movimientos", label: "Movimientos", icon: List },
  { id: "graficos", label: "Gráficos", icon: PieChart },
  { id: "personas", label: "Deudas", icon: Users },
  { id: "fijos", label: "Fijos", icon: Repeat },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const activeIndex = TABS.findIndex((tab) => tab.id === active);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1">
      <div className="relative flex items-center backdrop-blur bg-card/95 border border-border rounded-full p-1.5">
        {/* capsula que se desliza al tab activo, en vez de depender solo del color */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: `calc((100% - 12px) / ${TABS.length})`,
            left: `calc(6px + ${activeIndex} * (100% - 12px) / ${TABS.length})`,
          }}
        />
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative z-10 flex-1 flex flex-col items-center gap-1 py-1.5"
            >
              <tab.icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
              <span className={`text-[9.5px] ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
