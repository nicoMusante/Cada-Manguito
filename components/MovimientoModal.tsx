"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import { type CategoriaConId, type CategoriaRow, type Movimiento, mapCategoria } from "@/lib/mockData";
import { formatMontoInput, parseMontoInput, numberToMontoDisplay, MONTO_MAXIMO } from "@/lib/formatMonto";
import { type Cotizacion } from "@/lib/dolar";
import { Button } from "@/components/ui/button";
import { CategoriaModal } from "@/components/CategoriaModal";
import { CategoriaSelector } from "@/components/CategoriaSelector";

export type TipoNuevoSelector = {
  actual: "movimiento" | "deuda";
  onCambiar: (tipo: "movimiento" | "deuda") => void;
};

export function MovimientoModal({
  movimiento,
  cotizacion,
  onClose,
  onSaved,
  onCategoriaCreada,
  tipoSelector,
}: {
  movimiento?: Movimiento | null; // si viene, es modo edición
  cotizacion?: Cotizacion | null;
  onClose: () => void;
  onSaved: () => void;
  onCategoriaCreada?: () => void;
  tipoSelector?: TipoNuevoSelector; // switch "Movimiento/Deuda" compartido con DeudaModal, sólo al crear desde el FAB
}) {
  const esEdicion = !!movimiento;

  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">(movimiento?.tipo === "in" ? "INGRESO" : "GASTO");
  const [categoriaId, setCategoriaId] = useState<number | null>(movimiento?.categoriaId ?? null);
  const [descripcion, setDescripcion] = useState(movimiento?.desc ?? "");
  const [moneda, setMoneda] = useState<"ARS" | "USD">(movimiento?.moneda ?? "ARS");
  const [monto, setMonto] = useState(() => {
    if (!movimiento) return "";
    const esUsd = movimiento.moneda === "USD" && movimiento.montoOriginal != null;
    return numberToMontoDisplay(esUsd ? movimiento.montoOriginal! : Math.abs(movimiento.monto), esUsd);
  });
  const [fecha, setFecha] = useState(() => {
    if (movimiento) return movimiento.fechaISO.slice(0, 10);
    // fecha local de hoy, no toISOString() (es UTC y puede dar el día
    // siguiente de noche en Argentina)
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  });
  const [compartir, setCompartir] = useState(false);
  const [montoPersonalizado, setMontoPersonalizado] = useState(false);
  const [personasCompartidas, setPersonasCompartidas] = useState<{ nombre: string; monto: string }[]>([
    { nombre: "", monto: "" },
  ]);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarCategorias = () => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => setCategorias(rows.map(mapCategoria)))
      .catch((err) => console.error("Error al cargar categorías:", err));
  };

  useEffect(() => {
    cargarCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  function agregarPersona() {
    setPersonasCompartidas((prev) => [...prev, { nombre: "", monto: "" }]);
  }
  function quitarPersona(i: number) {
    setPersonasCompartidas((prev) => prev.filter((_, idx) => idx !== i));
  }
  function actualizarPersona(i: number, campo: "nombre" | "monto", valor: string) {
    setPersonasCompartidas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  // calcula cuánto le corresponde pagar a cada persona. Yo también soy un
  // participante más del gasto (mi parte no genera deuda, es implícita): sin
  // monto personalizado el total se reparte entre las personas agregadas +
  // yo; con monto personalizado, las que tienen monto propio pagan eso y el
  // resto se reparte en partes iguales entre las demás + yo.
  function calcularSplit(): { resultado: { nombre: string; monto: number }[]; error: string | null } {
    const nombradas = personasCompartidas.filter((p) => p.nombre.trim());
    if (nombradas.length === 0) return { resultado: [], error: null };
    const montoNum = Number(parseMontoInput(monto)) || 0;
    const montoArsBase = moneda === "USD" && cotizacion?.venta ? montoNum * cotizacion.venta : montoNum;

    if (!montoPersonalizado) {
      const share = montoArsBase / (nombradas.length + 1);
      return { resultado: nombradas.map((p) => ({ nombre: p.nombre.trim(), monto: share })), error: null };
    }

    const conMonto = nombradas.filter((p) => Number(parseMontoInput(p.monto)) > 0);
    const sinMonto = nombradas.filter((p) => !(Number(parseMontoInput(p.monto)) > 0));
    const sumaCustom = conMonto.reduce((acc, p) => acc + Number(parseMontoInput(p.monto)), 0);
    const restante = montoArsBase - sumaCustom;

    if (sinMonto.length === 0) {
      if (restante < 0) return { resultado: [], error: "Los montos personalizados suman más que el total." };
      return { resultado: conMonto.map((p) => ({ nombre: p.nombre.trim(), monto: Number(parseMontoInput(p.monto)) })), error: null };
    }
    if (restante <= 0) {
      return { resultado: [], error: "Los montos personalizados ya suman el total o más." };
    }
    const shareRestante = restante / (sinMonto.length + 1);
    return {
      resultado: [
        ...conMonto.map((p) => ({ nombre: p.nombre.trim(), monto: Number(parseMontoInput(p.monto)) })),
        ...sinMonto.map((p) => ({ nombre: p.nombre.trim(), monto: shareRestante })),
      ],
      error: null,
    };
  }

  const { resultado: previewCompartir, error: errorCompartir } = calcularSplit();

  function handleTipoChange(nuevoTipo: "GASTO" | "INGRESO") {
    setTipo(nuevoTipo);
    // la categoría anterior era de otro tipo — no tiene sentido para el
    // nuevo, y tampoco elijo una por defecto (ver cargarCategorias)
    setCategoriaId(null);
  }

  function handleMonedaChange(nuevaMoneda: "ARS" | "USD") {
    if (nuevaMoneda === moneda) return;
    setMoneda(nuevaMoneda);
    if (nuevaMoneda === "ARS") setMonto((prev) => prev.split(",")[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(parseMontoInput(monto));
    if (!categoriaId && !descripcion.trim()) return setError("Agregá una categoría o una descripción.");
    // en edición se permite 0 (gasto compartido que ya se cobró completo);
    // al crear, no tiene sentido cargar un movimiento en $0
    if (Number.isNaN(montoNum) || montoNum < 0 || (montoNum === 0 && !esEdicion)) {
      return setError("El monto tiene que ser mayor a 0.");
    }
    if (!esEdicion && tipo === "GASTO" && compartir && !descripcion.trim()) return setError("Para compartir el gasto agregá una descripción.");
    if (!esEdicion && tipo === "GASTO" && compartir && errorCompartir) return setError(errorCompartir);
    if (moneda === "USD" && !cotizacion?.venta) return setError("No se pudo obtener la cotización. Probá de nuevo en un momento.");

    const montoArs = moneda === "USD" ? montoNum * cotizacion!.venta : montoNum;
    if (montoArs > MONTO_MAXIMO) return setError("El monto es demasiado grande.");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/movimientos/${movimiento!.id}` : "/api/movimientos";
      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          descripcion: descripcion.trim() || null,
          monto: montoArs,
          tipo,
          moneda,
          monto_original: moneda === "USD" ? montoNum : null,
          fecha,
          ...(!esEdicion && tipo === "GASTO" && compartir && previewCompartir.length > 0
            ? { compartir: { personas: previewCompartir.map((p) => ({ persona_nombre: p.nombre, monto: p.monto })) } }
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
          <p className="text-[15px] font-semibold text-foreground">
            {esEdicion ? "Editar movimiento" : tipoSelector ? "Nuevo" : "Nuevo movimiento"}
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

        {!esEdicion && tipoSelector && (
          <div className="flex rounded-full p-1 mb-4 bg-secondary">
            <button
              type="button"
              onClick={() => tipoSelector.onCambiar("movimiento")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipoSelector.actual === "movimiento" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Movimiento
            </button>
            <button
              type="button"
              onClick={() => tipoSelector.onCambiar("deuda")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipoSelector.actual === "deuda" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Deuda
            </button>
          </div>
        )}

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

            <CategoriaSelector
              categorias={categoriasFiltradas}
              categoriaId={categoriaId}
              onSelect={setCategoriaId}
              onAgregarNueva={() => setAgregandoCategoria(true)}
            />

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="ej. Supermercado"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
                  <div className="flex rounded-full p-1 bg-secondary shrink-0 border border-border">
                    <button
                      type="button"
                      onClick={() => handleMonedaChange("ARS")}
                      className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition ${
                        moneda === "ARS" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonedaChange("USD")}
                      className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition ${
                        moneda === "USD" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      US$
                    </button>
                  </div>
                </div>
                <input
                  value={monto}
                  onChange={(e) => setMonto(formatMontoInput(e.target.value, moneda === "USD"))}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={montoPersonalizado}
                        onChange={(e) => setMontoPersonalizado(e.target.checked)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-[11.5px] text-muted-foreground">Monto personalizado por persona</span>
                    </label>

                    <div className="space-y-2">
                      {personasCompartidas.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            value={p.nombre}
                            onChange={(e) => actualizarPersona(i, "nombre", e.target.value)}
                            placeholder="Nombre"
                            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[13px] outline-none bg-card text-foreground focus:ring-2 focus:ring-ring"
                          />
                          {montoPersonalizado && (
                            <input
                              value={p.monto}
                              onChange={(e) => actualizarPersona(i, "monto", formatMontoInput(e.target.value, false))}
                              placeholder="Auto"
                              inputMode="decimal"
                              className="w-20 rounded-lg px-2.5 py-2 text-[13px] outline-none bg-card text-foreground focus:ring-2 focus:ring-ring"
                            />
                          )}
                          {personasCompartidas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => quitarPersona(i)}
                              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={agregarPersona} className="text-[11.5px] font-medium text-primary">
                      + Agregar persona
                    </button>

                    {previewCompartir.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {previewCompartir.map((p, i) => (
                          <p key={i} className="text-[10.5px] text-income">
                            {p.nombre} te debe ${p.monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </p>
                        ))}
                      </div>
                    )}
                    {errorCompartir && <p className="text-[10.5px] text-destructive">{errorCompartir}</p>}
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
    {agregandoCategoria && (
      <CategoriaModal
        onClose={() => setAgregandoCategoria(false)}
        onCreated={() => {
          cargarCategorias();
          onCategoriaCreada?.();
        }}
      />
    )}
    </>
  );
}
