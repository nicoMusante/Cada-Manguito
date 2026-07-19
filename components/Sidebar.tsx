"use client";

import type { Theme } from "@/lib/theme";
import { TABS, type TabId } from "./BottomNav";

export function Sidebar({
  t,
  active,
  onChange,
}: {
  t: Theme;
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="hidden lg:flex flex-col w-56 shrink-0 gap-1 pr-6">
      <p className="text-[11px] tracking-[0.15em] uppercase mb-2 px-2" style={{ color: t.textSecondary }}>
        Cada Manguito
      </p>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition"
            style={{
              backgroundColor: isActive ? t.surface : "transparent",
              color: isActive ? t.textPrimary : t.textSecondary,
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
