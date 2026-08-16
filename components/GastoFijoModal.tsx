"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { type CategoriaConId, type CategoriaRow, type GastoFijo, mapCategoria } from "@/lib/mockData";
import { formatMontoInput, parseMontoInput, numberToMontoDisplay, MONTO_MAXIMO } from "@/lib/formatMonto";
import { Button } from "@/components/ui/button";
import { CategoriaModal } from "@/components/CategoriaModal";
import { CategoriaSelector } from "@/components/CategoriaSelector";

export function GastoFijoModal({
  gastoFijo,
  onClose,
  onSaved,
}: {
  gastoFijo?: GastoFijo | null; // si viene, es modo edición
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!gastoFijo;

  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(gastoFijo?.categoriaId ?? null);
  const [descripcion, setDescripcion] = useState(gastoFijo?.desc ?? "");
  const [monto, setMonto] = useState(gastoFijo ? numberToMontoDisplay(gastoFijo.monto, false) : "");
  const [diaMes, setDiaMes] = useState(gastoFijo ? String(gastoFijo.diaMes) : "1");
  const [proximoMes, setProximoMes] = useState(false);
  const [tieneCuotas, setTieneCuotas] = useState(false);
  const [cuotas, setCuotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);

  const cargarCategorias = () => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => {
        const mapped = rows.map(mapCategoria).filter((c) => c.tipo === "GASTO");
        setCategorias(mapped);
        setCategoriaId((actual) => actual ?? (mapped.length > 0 ? mapped[0].id : null));
      })
      .catch((err) => console.error("Error al cargar categorías:", err));
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(parseMontoInput(monto));
    const diaNum = Number(diaMes);
    const cuotasNum = Number(cuotas);
    if (!categoriaId) return setError("Elegí una categoría.");
    if (!descripcion.trim()) return setError("Agregá una descripción.");
    if (!montoNum || montoNum <= 0) return setError("El monto tiene que ser mayor a 0.");
    if (montoNum > MONTO_MAXIMO) return setError("El monto es demasiado grande.");
    if (!diaNum || diaNum < 1 || diaNum > 28) return setError("El día tiene que ser entre 1 y 28.");
    if (!esEdicion && tieneCuotas && (!cuotasNum || cuotasNum < 1)) return setError("Ingresá una cantidad de cuotas válida.");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/gastos-fijos/${gastoFijo!.id}` : "/api/gastos-fijos";
      const method = esEdicion ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          descripcion: descripcion.trim(),
          monto: montoNum,
          dia_mes: diaNum,
          ...(esEdicion ? {} : { proximo_mes: proximoMes, cuotas_totales: tieneCuotas ? cuotasNum : null }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar el gasto fijo.");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 bg-card animate-in fade-in-0 slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">{esEdicion ? "Editar gasto fijo" : "Nuevo gasto fijo"}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CategoriaSelector
            categorias={categorias}
            categoriaId={categoriaId}
            onSelect={setCategoriaId}
            onAgregarNueva={() => setAgregandoCategoria(true)}
          />

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Alquiler"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
              <input
                value={monto}
                onChange={(e) => setMonto(formatMontoInput(e.target.value, false))}
                placeholder="0"
                inputMode="decimal"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="w-24">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Día del mes</label>
              <input
                value={diaMes}
                onChange={(e) => setDiaMes(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1"
                inputMode="numeric"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {!esEdicion && (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">¿Cuándo empieza?</label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setProximoMes(false)}
                    className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] font-medium border text-foreground"
                    style={{
                      borderColor: !proximoMes ? "hsl(var(--ring))" : "hsl(var(--border))",
                      backgroundColor: !proximoMes ? "hsl(var(--ring) / 0.15)" : "transparent",
                    }}
                  >
                    Este mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setProximoMes(true)}
                    className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] font-medium border text-foreground"
                    style={{
                      borderColor: proximoMes ? "hsl(var(--ring))" : "hsl(var(--border))",
                      backgroundColor: proximoMes ? "hsl(var(--ring) / 0.15)" : "transparent",
                    }}
                  >
                    El mes que viene
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={tieneCuotas}
                    onChange={(e) => setTieneCuotas(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  ¿Tiene cuotas?
                </label>
                {tieneCuotas && (
                  <input
                    value={cuotas}
                    onChange={(e) => setCuotas(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Cantidad de cuotas"
                    inputMode="numeric"
                    className="w-full mt-2 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                )}
              </div>
            </>
          )}

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 h-auto text-[14px] font-medium"
          >
            <Check size={16} /> {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear gasto fijo"}
          </Button>
        </form>
      </div>
    </div>
    {agregandoCategoria && (
      <CategoriaModal
        onClose={() => setAgregandoCategoria(false)}
        onCreated={cargarCategorias}
      />
    )}
    </>
  );
}
