"use client";

import { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { type Movimiento, fmt } from "@/lib/mockData";
import { formatUSD, type Cotizacion } from "@/lib/dolar";

const LONG_PRESS_MS = 220;

export function MovimientoItem({
  m,
  subtitle,
  onEdit,
  cotizacion,
}: {
  m: Movimiento;
  subtitle: string;
  onEdit: () => void;
  cotizacion?: Cotizacion | null;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [pressing, setPressing] = useState(false);
  const [hovered, setHovered] = useState(false);

  function startPress(e: React.TouchEvent) {
    didLongPress.current = false;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(false);
      onEdit();
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
  }

  function onTouchEnd(e: React.TouchEvent) {
    // si hubo long press, el modal ya abrió — frenamos el click fantasma que
    // el navegador dispara al soltar el dedo, que si no cae sobre el fondo
    // del modal recién abierto y lo cierra solo.
    if (didLongPress.current) e.preventDefault();
    cancelPress();
  }

  return (
    <div
      className={`w-full flex items-center gap-3 py-2.5 border-b border-border last:border-0 select-none transition-opacity ${pressing ? "opacity-60" : "opacity-100"}`}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onTouchStart={startPress}
      onTouchEnd={onTouchEnd}
      onTouchMove={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-muted">
        <m.icon size={15} className="text-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate text-foreground">{m.desc}</p>
        <p className="text-[10.5px] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-[13px] font-semibold ${m.tipo === "in" ? "text-income" : "text-foreground"}`}>
          {m.tipo === "in" ? "+" : "-"}{fmt(Math.abs(m.monto))}
        </p>
        {formatUSD(Math.abs(m.monto), cotizacion ?? null) && (
          <p className="text-[10px] text-muted-foreground">{formatUSD(Math.abs(m.monto), cotizacion ?? null)}</p>
        )}
      </div>

      {/* Tres puntitos — solo visibles en desktop (hover) */}
      <button
        onClick={onEdit}
        className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-full ml-1 text-muted-foreground transition-opacity ${
          hovered ? "opacity-100 bg-muted pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        tabIndex={hovered ? 0 : -1}
        aria-label="Editar o eliminar"
      >
        <MoreVertical size={15} />
      </button>
    </div>
  );
}
