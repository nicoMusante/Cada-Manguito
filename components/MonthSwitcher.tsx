"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthSwitcher({
  label, onAnterior, onSiguiente, esMesActual,
}: { label: string; onAnterior: () => void; onSiguiente: () => void; esMesActual: boolean }) {
  return (
    <div
      data-swipe-ignore
      className="flex items-center justify-between px-5 lg:px-0 h-9 lg:h-10"
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

// mismo alto/padding que MonthSwitcher, para las pestañas que no filtran por
// mes (Deudas, Fijos) — así el contenedor nunca cambia de altura al pasar de
// una pestaña con selector de mes a una sin él (evita el salto de layout)
export function SinFiltroMes({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center px-5 lg:px-0 h-9 lg:h-10">
      <p className="text-[11px] lg:text-[13px] text-center text-muted-foreground">{mensaje}</p>
    </div>
  );
}
