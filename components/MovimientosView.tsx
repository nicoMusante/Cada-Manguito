"use client";

import { type Movimiento, type CategoriaConId } from "@/lib/mockData";
import type { Cotizacion } from "@/lib/dolar";
import { MovimientoItem, MovimientoItemSkeleton } from "@/components/MovimientoItem";
import { CategoriaChipBar } from "@/components/CategoriaChipBar";
import { Card, CardContent } from "@/components/ui/card";

export function MovimientosView({
  movimientos, loading, categorias, loadingCategorias, onSelectMovimiento, cotizacion, onAddCategoria, onEliminarCategoria,
}: {
  movimientos: Movimiento[];
  loading: boolean;
  categorias: CategoriaConId[];
  loadingCategorias?: boolean;
  onSelectMovimiento: (m: Movimiento) => void;
  cotizacion?: Cotizacion | null;
  onAddCategoria: () => void;
  onEliminarCategoria: (id: number) => void;
}) {
  const grouped = movimientos.reduce<Record<string, Movimiento[]>>((acc, m) => {
    acc[m.fecha] = acc[m.fecha] || [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  return (
    <div className="pb-4 lg:pb-0">
      <div
        data-swipe-ignore
        className="mt-3 lg:mt-6 flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar px-5 lg:px-0 lg:flex-wrap py-1"
      >
        <CategoriaChipBar
          categorias={categorias}
          seleccionadas={new Set()}
          sinCategoria={false}
          onAddCategoria={onAddCategoria}
          onEliminarCategoria={onEliminarCategoria}
          loading={loadingCategorias}
        />
      </div>

      <div className="px-5 lg:px-0 mt-3 flex items-center justify-between">
        <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">
          {movimientos.length} movimientos
        </p>
      </div>

      {loading ? (
        <div className="px-5 lg:px-0 mt-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-none shadow-sm bg-secondary overflow-hidden">
              <CardContent className="px-3.5 pb-1 pt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <MovimientoItemSkeleton key={j} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : movimientos.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">
          Todavía no cargaste ningún movimiento.
        </p>
      ) : (
        <div className="px-5 lg:px-0 mt-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start animate-in fade-in-0 duration-300">
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
