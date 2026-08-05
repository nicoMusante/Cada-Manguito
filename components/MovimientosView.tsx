"use client";

import { type Movimiento } from "@/lib/mockData";
import type { Cotizacion } from "@/lib/dolar";
import { MovimientoItem } from "@/components/MovimientoItem";
import { Card, CardContent } from "@/components/ui/card";

export function MovimientosView({
  movimientos, loading, onSelectMovimiento, cotizacion,
}: {
  movimientos: Movimiento[];
  loading: boolean;
  onSelectMovimiento: (m: Movimiento) => void;
  cotizacion?: Cotizacion | null;
}) {
  const grouped = movimientos.reduce<Record<string, Movimiento[]>>((acc, m) => {
    acc[m.fecha] = acc[m.fecha] || [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  return (
    <div className="pb-4 lg:pb-0">
      <p className="px-5 lg:px-0 mt-3 lg:mt-6 text-[11.5px] lg:text-[13px] text-muted-foreground">
        {movimientos.length} movimientos
      </p>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">
          Todavía no cargaste ningún movimiento.
        </p>
      ) : (
        <div className="px-5 lg:px-0 mt-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
          {Object.entries(grouped).map(([fecha, items]) => (
            <Card key={fecha} className="border-none shadow-sm bg-secondary overflow-hidden">
              <p className="px-3.5 pt-3 text-[10.5px] tracking-[0.1em] uppercase text-muted-foreground">{fecha}</p>
              <CardContent className="px-3.5 pb-1 pt-2">
                {items.map((m) => (
                  <MovimientoItem key={m.id} m={m} subtitle={m.cat} onEdit={() => onSelectMovimiento(m)} cotizacion={cotizacion} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
