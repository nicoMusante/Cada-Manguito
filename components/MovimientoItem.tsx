"use client";

import { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { type Movimiento, fmt } from "@/lib/mockData";

const LONG_PRESS_MS = 220;

export function MovimientoItem({
  t,
  m,
  subtitle,
  onEdit,
}: {
  t: Theme;
  m: Movimiento;
  subtitle: string;
  onEdit: () => void;
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
      className="w-full flex items-center gap-3 py-2.5 border-b last:border-0 select-none"
      style={{
        borderColor: t.divider,
        opacity: pressing ? 0.6 : 1,
        transition: "opacity 0.15s",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onTouchStart={startPress}
      onTouchEnd={onTouchEnd}
      onTouchMove={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: t.surface }}
      >
        <m.icon size={15} style={{ color: t.textPrimary }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: t.textPrimary }}>{m.desc}</p>
        <p className="text-[10.5px]" style={{ color: t.textSecondary }}>{subtitle}</p>
      </div>

      <p className="text-[13px] font-semibold" style={{ color: m.tipo === "in" ? t.ingresoAccent : t.textPrimary }}>
        {m.tipo === "in" ? "+" : "-"}{fmt(Math.abs(m.monto))}
      </p>

      {/* Tres puntitos — solo visibles en desktop (hover) */}
      <button
        onClick={onEdit}
        className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full ml-1 transition"
        style={{
          opacity: hovered ? 1 : 0,
          backgroundColor: hovered ? t.surface : "transparent",
          color: t.textSecondary,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.15s",
        }}
        tabIndex={hovered ? 0 : -1}
        aria-label="Editar o eliminar"
      >
        <MoreVertical size={15} />
      </button>
    </div>
  );
}
