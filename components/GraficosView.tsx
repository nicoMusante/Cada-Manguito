"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { SlidersHorizontal, X, PieChart as PieChartIcon, ListOrdered, CalendarDays } from "lucide-react";
import { fmt, type Movimiento, type CategoriaConId } from "@/lib/mockData";
import { CategoriaChipBar } from "@/components/CategoriaChipBar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// tooltip propio para que los charts respeten el tema activo en vez del
// fondo blanco que trae recharts por default
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm">
      {label && <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-[12.5px] font-semibold text-popover-foreground tabular-nums">
          {fmt(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function GraficosView({
  movimientos, loading, categorias, loadingCategorias,
}: {
  movimientos: Movimiento[];
  loading: boolean;
  categorias: CategoriaConId[];
  loadingCategorias?: boolean;
}) {
  const categoriasGasto = categorias.filter((c) => c.tipo === "GASTO");

  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<number>>(new Set());
  const [sinCategoria, setSinCategoria] = useState(false);
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  function toggleCategoria(id: number) {
    setCategoriasFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hayFiltroCategoria = categoriasFiltro.size > 0 || sinCategoria;
  const hayFiltro = hayFiltroCategoria || montoMin !== "" || montoMax !== "" || fechaDesde !== "" || fechaHasta !== "";
  const cantidadFiltrosActivos =
    categoriasFiltro.size + (sinCategoria ? 1 : 0) + (montoMin !== "" ? 1 : 0) + (montoMax !== "" ? 1 : 0) + (fechaDesde !== "" ? 1 : 0) + (fechaHasta !== "" ? 1 : 0);

  function limpiarFiltros() {
    setCategoriasFiltro(new Set());
    setSinCategoria(false);
    setMontoMin("");
    setMontoMax("");
    setFechaDesde("");
    setFechaHasta("");
  }

  const gastosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (m.tipo !== "out") return false;
      if (hayFiltroCategoria) {
        const coincideCategoria = m.categoriaId != null && categoriasFiltro.has(m.categoriaId);
        const coincideSinCategoria = sinCategoria && m.categoriaId == null;
        if (!coincideCategoria && !coincideSinCategoria) return false;
      }
      const montoAbs = Math.abs(m.monto);
      if (montoMin !== "" && montoAbs < Number(montoMin)) return false;
      if (montoMax !== "" && montoAbs > Number(montoMax)) return false;
      // fechaISO llega como YYYY-MM-DD, compara bien como string
      if (fechaDesde && m.fechaISO.slice(0, 10) < fechaDesde) return false;
      if (fechaHasta && m.fechaISO.slice(0, 10) > fechaHasta) return false;
      return true;
    });
  }, [movimientos, hayFiltroCategoria, categoriasFiltro, sinCategoria, montoMin, montoMax, fechaDesde, fechaHasta]);

  const totalGastado = gastosFiltrados.reduce((acc, m) => acc + Math.abs(m.monto), 0);

  const porCategoria = useMemo(() => {
    const map = new Map<number | null, { id: number | null; nombre: string; color: string; total: number }>();
    for (const m of gastosFiltrados) {
      const cat = categorias.find((c) => c.id === m.categoriaId);
      const prev = map.get(m.categoriaId);
      if (prev) prev.total += Math.abs(m.monto);
      else map.set(m.categoriaId, { id: m.categoriaId, nombre: cat?.name ?? m.cat, color: cat?.color ?? "#8A6D3B", total: Math.abs(m.monto) });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [gastosFiltrados, categorias]);

  const porDia = useMemo(() => {
    const map = new Map<string, { fechaISO: string; label: string; total: number }>();
    for (const m of gastosFiltrados) {
      const key = m.fechaISO.slice(0, 10);
      const prev = map.get(key);
      if (prev) prev.total += Math.abs(m.monto);
      else map.set(key, { fechaISO: key, label: m.fecha, total: Math.abs(m.monto) });
    }
    return [...map.values()].sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
  }, [gastosFiltrados]);

  const hayDatos = gastosFiltrados.length > 0;

  return (
    <div className="pb-4 lg:pb-0">
      {/* filtros: categoría, monto y fecha, agrupados en un panel */}
      <div className="px-5 lg:px-0 mt-3 lg:mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setFiltrosAbiertos(true)}
          className="flex items-center gap-1.5 rounded-full pl-3.5 pr-3 py-1.5 text-[12.5px] lg:text-[13px] font-medium border text-foreground bg-secondary"
          style={{ borderColor: hayFiltro ? "hsl(var(--primary))" : "transparent" }}
        >
          <SlidersHorizontal size={13} /> Filtrar
          {cantidadFiltrosActivos > 0 && (
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-semibold bg-primary text-primary-foreground">
              {cantidadFiltrosActivos}
            </span>
          )}
        </button>
      </div>

      {filtrosAbiertos && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45 animate-in fade-in-0 duration-200"
          onClick={() => setFiltrosAbiertos(false)}
        >
          <div
            className="w-full lg:w-[380px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 max-h-[85vh] overflow-y-auto bg-card animate-in fade-in-0 slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold text-foreground">Filtrar</p>
              <div className="flex items-center gap-2">
                {hayFiltro && (
                  <button type="button" onClick={limpiarFiltros} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <X size={11} /> Limpiar
                  </button>
                )}
                <button
                  onClick={() => setFiltrosAbiertos(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Categorías</p>
              <div className="flex gap-2 flex-wrap max-h-[220px] overflow-y-auto pr-0.5">
                <CategoriaChipBar
                  categorias={categoriasGasto}
                  seleccionadas={categoriasFiltro}
                  sinCategoria={sinCategoria}
                  onToggleCategoria={toggleCategoria}
                  onToggleSinCategoria={() => setSinCategoria((v) => !v)}
                  loading={loadingCategorias}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-muted-foreground">Monto mínimo</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                  placeholder="$0"
                  className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Monto máximo</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={montoMax}
                  onChange={(e) => setMontoMax(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* charts */}
      <div className="px-5 lg:px-0 mt-4">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[254px] lg:h-[294px] rounded-xl" />
            <Skeleton className="h-[254px] lg:h-[294px] rounded-xl" />
            <Skeleton className="h-[254px] lg:h-[284px] rounded-xl lg:col-span-2" />
          </div>
        ) : !hayDatos ? (
          <p className="text-[12.5px] text-muted-foreground">No hay gastos que coincidan con estos filtros.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in-0 duration-300">
            <Card className="border-none shadow-sm bg-secondary">
              <CardContent className="p-4 lg:p-5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground mb-4">
                  <PieChartIcon size={14} className="text-muted-foreground" /> Por categoría
                </p>
                <div className="relative h-[190px] lg:h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={porCategoria}
                        dataKey="total"
                        nameKey="nombre"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={3}
                        cornerRadius={4}
                        stroke="hsl(var(--secondary))"
                        strokeWidth={3}
                      >
                        {porCategoria.map((c) => (
                          <Cell key={String(c.id)} fill={c.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
                    <p className="text-[9.5px] text-muted-foreground text-center">Gastado {hayFiltro ? "(filtrado)" : "este mes"}</p>
                    <p className="text-[17px] lg:text-[20px] font-bold text-expense tabular-nums text-center">{fmt(totalGastado)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {porCategoria.slice(0, 6).map((c) => (
                    <div key={String(c.id)} className="flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-muted-foreground min-w-0 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.nombre}</span>
                      </span>
                      <span className="tabular-nums text-foreground font-medium shrink-0 pl-2">
                        {fmt(c.total)} · {Math.round((c.total / totalGastado) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-secondary">
              <CardContent className="p-4 lg:p-5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground mb-4">
                  <ListOrdered size={14} className="text-muted-foreground" /> Ranking de categorías
                </p>
                <div className="h-[190px] lg:h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porCategoria} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={88}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={14}>
                        {porCategoria.map((c) => (
                          <Cell key={String(c.id)} fill={c.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-secondary lg:col-span-2">
              <CardContent className="p-4 lg:p-5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground mb-4">
                  <CalendarDays size={14} className="text-muted-foreground" /> Por día
                </p>
                <div className="h-[190px] lg:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porDia} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="35%">
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="hsl(var(--expense))" maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
