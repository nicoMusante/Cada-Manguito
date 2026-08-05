"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthSwitcher({
  label, onAnterior, onSiguiente, esMesActual,
}: { label: string; onAnterior: () => void; onSiguiente: () => void; esMesActual: boolean }) {
  return (
    <div
      data-swipe-ignore
      className="sticky lg:static top-0 z-10 flex items-center justify-between px-5 lg:px-0 pt-3 pb-1.5 lg:pt-6 lg:pb-0 bg-card"
    >
      <button
        onClick={onAnterior}
        aria-label="Mes anterior"
        className="w-6 h-6 rounded-full flex items-center justify-center bg-secondary text-foreground"
      >
        <ChevronLeft size={13} />
      </button>
      <p className="text-[11.5px] lg:text-[14px] font-medium capitalize text-foreground">{label}</p>
      <button
        onClick={onSiguiente}
        disabled={esMesActual}
        aria-label="Mes siguiente"
        className="w-6 h-6 rounded-full flex items-center justify-center bg-secondary text-foreground disabled:opacity-30"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
