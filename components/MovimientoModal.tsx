"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import { type CategoriaConId, type CategoriaRow, type Movimiento, mapCategoria } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export function MovimientoModal({
  movimiento,
  onClose,
  onSaved,
}: {
  movimiento?: Movimiento | null; // si viene, es modo edición
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!movimiento;

  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">(movimiento?.tipo === "in" ? "INGRESO" : "GASTO");
  const [categoriaId, setCategoriaId] = useState<number | null>(movimiento?.categoriaId ?? null);
  const [descripcion, setDescripcion] = useState(movimiento?.desc ?? "");
  const [monto, setMonto] = useState(movimiento ? String(Math.abs(movimiento.monto)) : "");
  const [compartir, setCompartir] = useState(false);
  const [personaCompartida, setPersonaCompartida] = useState("");
  const [montoCompartido, setMontoCompartido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => {
        const mapped = rows.map(mapCategoria);
        setCategorias(mapped);
        if (!esEdicion) {
          const primeraGasto = mapped.find((c) => c.tipo === "GASTO");
          if (primeraGasto) setCategoriaId(primeraGasto.id);
        }
      })
      .catch((err) => console.error("Error al cargar categorías:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  function handleTipoChange(nuevoTipo: "GASTO" | "INGRESO") {
    setTipo(nuevoTipo);
    const primera = categorias.find((c) => c.tipo === nuevoTipo);
    setCategoriaId(primera ? primera.id : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(monto);
    if (!categoriaId) return setError("Elegí una categoría.");
    if (!descripcion.trim()) return setError("Agregá una descripción.");
    if (!montoNum || montoNum <= 0) return setError("El monto tiene que ser mayor a 0.");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/movimientos/${movimiento!.id}` : "/api/movimientos";
      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          descripcion: descripcion.trim(),
          monto: montoNum,
          ...(!esEdicion && tipo === "GASTO" && compartir && personaCompartida.trim() && Number(montoCompartido) > 0
            ? { compartir: { persona_nombre: personaCompartida.trim(), monto: Number(montoCompartido) } }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar el movimiento.");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDelete() {
    if (!movimiento) return;
    setEliminando(true);
    setError(null);
    try {
      const res = await fetch(`/api/movimientos/${movimiento.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar el movimiento.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setEliminando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">
            {esEdicion ? "Editar movimiento" : "Nuevo movimiento"}
          </p>
          <div className="flex items-center gap-2">
            {esEdicion && (
              <button
                type="button"
                onClick={() => setConfirmarBorrado(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-expense-soft text-expense"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
              <X size={16} />
            </button>
          </div>
        </div>

        {confirmarBorrado ? (
          <div className="space-y-4">
            <p className="text-[13.5px] text-foreground">
              ¿Seguro que querés eliminar <strong>{movimiento?.desc}</strong>? Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setConfirmarBorrado(false)}
                variant="secondary"
                className="flex-1 rounded-xl py-3 h-auto text-[14px] font-medium shadow-none"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={eliminando}
                variant="destructive"
                className="flex-1 rounded-xl py-3 h-auto text-[14px] font-medium"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex rounded-full p-1 bg-secondary">
              <button
                type="button"
                onClick={() => handleTipoChange("GASTO")}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                  tipo === "GASTO" ? "bg-expense text-expense-foreground" : "text-muted-foreground"
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("INGRESO")}
                className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                  tipo === "INGRESO" ? "bg-income text-income-foreground" : "text-muted-foreground"
                }`}
              >
                Ingreso
              </button>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoría</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {categoriasFiltradas.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoriaId(c.id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border text-foreground"
                    style={{
                      borderColor: categoriaId === c.id ? c.color : "hsl(var(--border))",
                      backgroundColor: categoriaId === c.id ? c.color + "22" : "transparent",
                    }}
                  >
                    <c.icon size={13} style={{ color: c.color }} />
                    {c.name}
                  </button>
                ))}
                {categoriasFiltradas.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">Cargando categorías...</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="ej. Palas y overgrips"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                inputMode="decimal"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            {!esEdicion && tipo === "GASTO" && (
              <div className="rounded-2xl p-3.5 bg-secondary border border-dashed border-muted-foreground/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compartir}
                    onChange={(e) => setCompartir(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-[12.5px] font-medium text-foreground">¿Lo compartiste con alguien?</span>
                </label>
                {compartir && (
                  <div className="mt-3 space-y-2.5">
                    <input
                      value={personaCompartida}
                      onChange={(e) => setPersonaCompartida(e.target.value)}
                      placeholder="Nombre de la persona"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-card text-foreground focus:ring-2 focus:ring-ring"
                    />
                    <input
                      value={montoCompartido}
                      onChange={(e) => setMontoCompartido(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="Cuánto te debe"
                      inputMode="decimal"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-card text-foreground focus:ring-2 focus:ring-ring"
                    />
                    {personaCompartida.trim() && Number(montoCompartido) > 0 && (
                      <p className="text-[10.5px] text-income">
                        Se va a crear un pendiente: {personaCompartida.trim()} te debe ${Number(montoCompartido).toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-[12px] text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl py-3 h-auto text-[14px] font-medium"
            >
              <Check size={16} /> {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar movimiento"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
