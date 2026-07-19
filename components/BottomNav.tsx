"use client";

import { Wallet, List, Users } from "lucide-react";
import type { Theme } from "@/lib/theme";

export type TabId = "resumen" | "movimientos" | "personas";

export const TABS: { id: TabId; label: string; icon: typeof Wallet }[] = [
  { id: "resumen", label: "Resumen", icon: Wallet },
  { id: "movimientos", label: "Movimientos", icon: List },
  { id: "personas", label: "Personas", icon: Users },
];

export function BottomNav({
  t,
  active,
  onChange,
}: {
  t: Theme;
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur px-6 py-3 flex items-center justify-around border-t"
      style={{ backgroundColor: t.navBg, borderColor: t.divider }}
    >
      {TABS.map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className="flex flex-col items-center gap-1">
          <tab.icon size={18} color={active === tab.id ? t.gastoAccent : t.textSecondary} />
          <span className="text-[10px]" style={{ color: active === tab.id ? t.textPrimary : t.textSecondary }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
