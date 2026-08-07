"use client";

import { useState } from "react";
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
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "in" | "out">("todos");
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<number>>(new Set());
  const [sinCategoria, setSinCategoria] = useState(false);

  function cambiarTipoFiltro(nuevo: "todos" | "in" | "out") {
    setTipoFiltro(nuevo);
    const tipoCategoria = nuevo === "in" ? "INGRESO" : nuevo === "out" ? "GASTO" : null;
    if (!tipoCategoria) return;
    setCategoriasFiltro((prev) => {
      const permitidas = new Set(categorias.filter((c) => c.tipo === tipoCategoria).map((c) => c.id));
      const next = new Set([...prev].filter((id) => permitidas.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  function toggleCategoria(id: number) {
    setCategoriasFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEliminarCategoria(id: number) {
    onEliminarCategoria(id);
    setCategoriasFiltro((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const categoriasVisibles = categorias.filter((c) =>
    tipoFiltro === "todos" ? true : c.tipo === (tipoFiltro === "in" ? "INGRESO" : "GASTO")
  );

  const hayFiltroCategoria = categoriasFiltro.size > 0 || sinCategoria;
  const hayFiltro = tipoFiltro !== "todos" || hayFiltroCategoria;

  const movimientosFiltrados = movimientos.filter((m) => {
    if (tipoFiltro !== "todos" && m.tipo !== tipoFiltro) return false;
    if (hayFiltroCategoria) {
      const coincideCategoria = m.categoriaId != null && categoriasFiltro.has(m.categoriaId);
      const coincideSinCategoria = sinCategoria && m.categoriaId == null;
      if (!coincideCategoria && !coincideSinCategoria) return false;
    }
    return true;
  });

  function limpiarFiltros() {
    setTipoFiltro("todos");
    setCategoriasFiltro(new Set());
    setSinCategoria(false);
  }

  const grouped = movimientosFiltrados.reduce<Record<string, Movimiento[]>>((acc, m) => {
    acc[m.fecha] = acc[m.fecha] || [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-3 lg:mt-6 flex rounded-full p-1 bg-secondary">
        <button
          type="button"
          onClick={() => cambiarTipoFiltro("todos")}
          className={`flex-1 py-1.5 rounded-full text-[12px] font-medium transition ${
            tipoFiltro === "todos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => cambiarTipoFiltro("in")}
          className={`flex-1 py-1.5 rounded-full text-[12px] font-medium transition ${
            tipoFiltro === "in" ? "bg-income text-income-foreground" : "text-muted-foreground"
          }`}
        >
          Ingresos
        </button>
        <button
          type="button"
          onClick={() => cambiarTipoFiltro("out")}
          className={`flex-1 py-1.5 rounded-full text-[12px] font-medium transition ${
            tipoFiltro === "out" ? "bg-expense text-expense-foreground" : "text-muted-foreground"
          }`}
        >
          Gastos
        </button>
      </div>

      <div
        data-swipe-ignore
        className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar px-5 lg:px-0 lg:flex-wrap py-1"
      >
        <CategoriaChipBar
          categorias={categoriasVisibles}
          seleccionadas={categoriasFiltro}
          sinCategoria={sinCategoria}
          onToggleCategoria={toggleCategoria}
          onToggleSinCategoria={() => setSinCategoria((v) => !v)}
          onAddCategoria={onAddCategoria}
          onEliminarCategoria={handleEliminarCategoria}
          loading={loadingCategorias}
        />
      </div>

      <div className="px-5 lg:px-0 mt-3 flex items-center justify-between">
        <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">
          {movimientosFiltrados.length} movimientos
        </p>
        {hayFiltro && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-[11px] font-medium text-muted-foreground"
          >
            Limpiar filtro
          </button>
        )}
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
      ) : movimientosFiltrados.length === 0 ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">
          {hayFiltro ? "No hay movimientos que coincidan con este filtro." : "Todavía no cargaste ningún movimiento."}
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
