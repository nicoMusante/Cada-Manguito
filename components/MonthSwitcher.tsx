"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Theme } from "@/lib/theme";

export function MonthSwitcher({
  t, label, onAnterior, onSiguiente, esMesActual,
}: { t: Theme; label: string; onAnterior: () => void; onSiguiente: () => void; esMesActual: boolean }) {
  return (
    <div data-swipe-ignore className="flex items-center justify-between px-5 lg:px-0 mt-4 lg:mt-6">
      <button
        onClick={onAnterior}
        aria-label="Mes anterior"
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: t.surface }}
      >
        <ChevronLeft size={16} style={{ color: t.textPrimary }} />
      </button>
      <p className="text-[12.5px] lg:text-[14px] font-medium capitalize" style={{ color: t.textPrimary }}>{label}</p>
      <button
        onClick={onSiguiente}
        disabled={esMesActual}
        aria-label="Mes siguiente"
        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
        style={{ backgroundColor: t.surface }}
      >
        <ChevronRight size={16} style={{ color: t.textPrimary }} />
      </button>
    </div>
  );
}
