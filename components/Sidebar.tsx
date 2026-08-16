"use client";

import { TABS, type TabId } from "./BottomNav";

export function Sidebar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="hidden lg:flex flex-col w-56 shrink-0 gap-1 pr-6">
      <p className="text-[11px] tracking-[0.15em] uppercase mb-2 px-2 text-muted-foreground">Cada Manguito</p>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
