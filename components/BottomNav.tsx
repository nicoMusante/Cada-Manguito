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
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur bg-background/90 px-6 py-3 flex items-center justify-around border-t border-border">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} className="flex flex-col items-center gap-1">
            <tab.icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
            <span className={`text-[10px] ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
