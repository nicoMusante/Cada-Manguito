"use client";

import { Check, X } from "lucide-react";
import { THEMES, THEME_LABELS, type Theme, type ThemeName } from "@/lib/theme";

export function ThemeModal({
  t, current, onSelect, onClose,
}: { t: Theme; current: ThemeName; onSelect: (name: ThemeName) => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[380px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5"
        style={{ backgroundColor: t.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>Tema</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        <div className="space-y-2">
          {(Object.keys(THEMES) as ThemeName[]).map((name) => {
            const theme = THEMES[name];
            const selected = name === current;
            return (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 border"
                style={{ borderColor: selected ? theme.avatarBg : t.divider, backgroundColor: t.surface }}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: theme.avatarBg, boxShadow: `0 0 0 3px ${theme.bg}, 0 0 0 4px ${theme.divider}` }}
                />
                <span className="flex-1 text-left text-[13.5px]" style={{ color: t.textPrimary }}>{THEME_LABELS[name]}</span>
                {selected && <Check size={16} style={{ color: theme.avatarBg }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
