"use client";

import { type Movimiento, fmt, montoEfectivoArs, SIN_CATEGORIA } from "@/lib/mockData";
import { formatUSD, type Cotizacion } from "@/lib/dolar";
import { Skeleton } from "@/components/ui/skeleton";

// placeholder con la misma silueta de MovimientoItem, para que la lista no
// aparezca de golpe cuando termina de resolver el GET
export function MovimientoItemSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 py-2.5">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-2/3 max-w-[160px]" />
        <Skeleton className="h-2.5 w-1/3 max-w-[90px]" />
      </div>
      <Skeleton className="h-3.5 w-14 shrink-0" />
    </div>
  );
}

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
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full flex items-center gap-3 py-2.5 fila-picada text-left active:opacity-70 transition"
    >
      <div className="icono-cosido w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-muted">
        <m.icon size={15} className="text-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate text-foreground">
          {m.desc ? (
            m.desc
          ) : m.categoriaId != null ? (
            <>
              {m.cat} <span className="italic text-muted-foreground">(Sin descripción)</span>
            </>
          ) : (
            <span className="italic text-muted-foreground">Sin descripción</span>
          )}
        </p>
        <p className={`text-[10.5px] text-muted-foreground ${subtitle === SIN_CATEGORIA ? "italic" : ""}`}>{subtitle}</p>
      </div>

      <div className="text-right shrink-0">
        {m.moneda === "USD" && m.montoOriginal != null ? (
          <>
            <p className={`text-[13px] font-semibold monto ${m.tipo === "in" ? "text-income" : "text-foreground"}`}>
              {m.tipo === "in" ? "+" : "-"}US$ {m.montoOriginal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground monto">
              {fmt(Math.abs(montoEfectivoArs(m, cotizacion ?? null)))}
            </p>
          </>
        ) : (
          <>
            <p className={`text-[13px] font-semibold monto ${m.tipo === "in" ? "text-income" : "text-foreground"}`}>
              {m.tipo === "in" ? "+" : "-"}{fmt(Math.abs(m.monto))}
            </p>
            {formatUSD(Math.abs(m.monto), cotizacion ?? null) && (
              <p className="text-[10px] text-muted-foreground monto">{formatUSD(Math.abs(m.monto), cotizacion ?? null)}</p>
            )}
          </>
        )}
      </div>
    </button>
  );
}
