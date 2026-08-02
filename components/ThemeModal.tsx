"use client";

import { Check, X } from "lucide-react";
import { THEME_LABELS, THEME_SWATCHES, type ThemeName } from "@/lib/theme";

export function ThemeModal({
  current, onSelect, onClose,
}: { current: ThemeName; onSelect: (name: ThemeName) => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[380px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">Tema</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {(Object.keys(THEME_SWATCHES) as ThemeName[]).map((name) => {
            const swatch = THEME_SWATCHES[name];
            const selected = name === current;
            return (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 border bg-secondary"
                style={{ borderColor: selected ? swatch.accent : "transparent" }}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: swatch.accent, boxShadow: `0 0 0 3px ${swatch.bg}, 0 0 0 4px ${swatch.ring}` }}
                />
                <span className="flex-1 text-left text-[13.5px] text-foreground">{THEME_LABELS[name]}</span>
                {selected && <Check size={16} style={{ color: swatch.accent }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
