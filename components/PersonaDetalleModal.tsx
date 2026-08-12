"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2, Pencil, Square, CheckSquare, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFechaLocal } from "@/lib/periodo";
import { formatMontoInput, parseMontoInput } from "@/lib/formatMonto";
import { DeudaModal, type DeudaEditable } from "@/components/DeudaModal";

type Pago = { id: number; monto: string; fecha: string };

type DeudaHistorial = {
  id: number;
  tipo: "ME_DEBEN" | "YO_DEBO";
  monto: string;
  descripcion: string;
  fecha: string;
  estado: "pendiente" | "saldado";
  saldado_en: string | null;
  movimiento_id: number | null;
  pagado: string;
  pagos: Pago[];
};

const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PersonaDetalleModal({
  personaId,
  onClose,
  onChanged,
}: {
  personaId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [neto, setNeto] = useState(0);
  const [historial, setHistorial] = useState<DeudaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saldando, setSaldando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [saldandoSeleccion, setSaldandoSeleccion] = useState(false);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [editando, setEditando] = useState<DeudaEditable | null>(null);

  async function refrescar() {
    const data = await fetch(`/api/personas/${personaId}`).then((r) => r.json());
    setNeto(data.neto);
    setHistorial(data.historial);
  }

  useEffect(() => {
    fetch(`/api/personas/${personaId}`)
      .then((r) => r.json())
      .then((data) => {
        setNombre(data.persona.nombre);
        setNeto(data.neto);
        setHistorial(data.historial);
      })
      .catch((err) => console.error("Error al cargar historial:", err))
      .finally(() => setLoading(false));
  }, [personaId]);

  async function handleSaldar() {
    setSaldando(true);
    try {
      const res = await fetch(`/api/personas/${personaId}/saldar`, { method: "PATCH" });
      if (!res.ok) throw new Error("No se pudo saldar.");
      onChanged();
      onClose();
    } catch (err) {
      console.error(err);
      setSaldando(false);
    }
  }

  function toggleSeleccion(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaldarSeleccionados() {
    if (seleccionados.size === 0) return;
    setSaldandoSeleccion(true);
    try {
      const ids = Array.from(seleccionados);
      const res = await fetch("/api/deudas/saldar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("No se pudo registrar el pago.");

      onChanged();
      await refrescar();
      setSeleccionados(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setSaldandoSeleccion(false);
    }
  }

  async function handleDeleteEntry(id: number) {
    if (!confirm("¿Eliminar esta deuda? No se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/deudas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar.");
      setHistorial((h) => h.filter((d) => d.id !== id));
      setSeleccionados((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (expandidoId === id) setExpandidoId(null);
      onChanged();
    } catch (err) {
      console.error("Error al eliminar deuda:", err);
    }
  }

  function toggleExpandir(id: number) {
    setExpandidoId((prev) => (prev === id ? null : id));
    setMontoPago("");
    setErrorPago(null);
  }

  async function handleAgregarPago(deudaId: number) {
    setErrorPago(null);
    const montoNum = Number(parseMontoInput(montoPago));
    if (!montoNum || montoNum <= 0) return setErrorPago("El monto tiene que ser mayor a 0.");

    setEnviandoPago(true);
    try {
      const res = await fetch(`/api/deudas/${deudaId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: montoNum }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo registrar el pago.");

      onChanged();
      await refrescar();
      setMontoPago("");
    } catch (err) {
      setErrorPago(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviandoPago(false);
    }
  }

  async function handleEliminarPago(pagoId: number) {
    if (!confirm("¿Eliminar este pago? La deuda vuelve a quedar pendiente por ese monto.")) return;
    try {
      const res = await fetch(`/api/pagos/${pagoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el pago.");
      onChanged();
      await refrescar();
    } catch (err) {
      console.error("Error al eliminar pago:", err);
    }
  }

  const teDeben = neto > 0;
  const montoSeleccion = historial
    .filter((h) => seleccionados.has(h.id))
    .reduce((acc, h) => acc + (Number(h.monto) - Number(h.pagado)), 0);

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[440px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 max-h-[85vh] overflow-y-auto bg-card animate-in fade-in-0 slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                teDeben ? "bg-income text-income-foreground" : "bg-expense text-expense-foreground"
              }`}
            >
              {nombre[0] || "?"}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{nombre}</p>
              {neto !== 0 && (
                <p className={`text-[11px] ${teDeben ? "text-income" : "text-expense"}`}>
                  {teDeben ? "Te debe" : "Le debés"} {fmt(Math.abs(neto))}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p className="text-[12.5px] text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Historial</p>
              {seleccionados.size > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {seleccionados.size} seleccionado{seleccionados.size > 1 ? "s" : ""} · {fmt(montoSeleccion)}
                </p>
              )}
            </div>
            <div className="space-y-1 mb-4">
              {historial.map((h) => {
                const seleccionable = h.estado === "pendiente";
                const marcado = seleccionados.has(h.id);
                const pagado = Number(h.pagado);
                const saldoPendiente = Number(h.monto) - pagado;
                const expandido = expandidoId === h.id;
                const accentClass = h.tipo === "ME_DEBEN" ? "text-income" : "text-expense";

                return (
                  <div key={h.id} className="border-b border-border last:border-0">
                    <div className="flex items-center gap-3 py-2.5 group">
                      {seleccionable && (
                        <button
                          onClick={() => toggleSeleccion(h.id)}
                          className="shrink-0 p-1 -m-1"
                          aria-label={marcado ? "Quitar de la selección" : "Seleccionar"}
                        >
                          {marcado ? (
                            <CheckSquare size={18} className={teDeben ? "text-income" : "text-expense"} />
                          ) : (
                            <Square size={18} className="text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpandir(h.id)}
                        className="flex-1 min-w-0 text-left flex items-center gap-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12.5px] ${h.estado === "saldado" ? "text-muted-foreground line-through" : "text-foreground"}`}
                          >
                            {h.descripcion}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {parseFechaLocal(h.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                            {h.estado === "saldado" && " · saldado"}
                            {h.estado === "pendiente" && pagado > 0 && ` · ${h.tipo === "ME_DEBEN" ? "pagó" : "pagaste"} ${fmt(pagado)}`}
                          </p>
                        </div>
                        {expandido ? (
                          <ChevronUp size={13} className="text-muted-foreground" />
                        ) : (
                          <ChevronDown size={13} className="text-muted-foreground" />
                        )}
                      </button>
                      <p className={`text-[12.5px] font-semibold ${h.estado === "saldado" ? "text-muted-foreground" : accentClass}`}>
                        {h.tipo === "ME_DEBEN" ? "+" : "-"}{fmt(h.estado === "pendiente" ? saldoPendiente : Number(h.monto))}
                      </p>
                      {h.estado === "pendiente" && h.pagos.length === 0 && h.movimiento_id == null && (
                        <button
                          onClick={() =>
                            setEditando({
                              id: h.id,
                              tipo: h.tipo,
                              personaNombre: nombre,
                              descripcion: h.descripcion,
                              monto: Number(h.monto),
                              fecha: h.fecha,
                            })
                          }
                          className="shrink-0"
                          aria-label="Editar"
                        >
                          <Pencil size={13} className="text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteEntry(h.id)} className="shrink-0" aria-label="Eliminar">
                        <Trash2 size={13} className="text-muted-foreground" />
                      </button>
                    </div>

                    {expandido && (
                      <div className="pb-3 pl-1 space-y-2">
                        {h.pagos.length > 0 && (
                          <div className="space-y-1">
                            {h.pagos.map((pg) => (
                              <div key={pg.id} className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                                <span className="flex-1">
                                  {parseFechaLocal(pg.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — {fmt(Number(pg.monto))}
                                </span>
                                <button onClick={() => handleEliminarPago(pg.id)} aria-label="Deshacer pago">
                                  <Trash2 size={12} className="text-muted-foreground" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {h.estado === "pendiente" ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={montoPago}
                              onChange={(e) => setMontoPago(formatMontoInput(e.target.value, false))}
                              placeholder={`Saldo: ${fmt(saldoPendiente)}`}
                              inputMode="decimal"
                              className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
                            />
                            <button
                              onClick={() => handleAgregarPago(h.id)}
                              disabled={enviandoPago}
                              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-60 ${
                                h.tipo === "ME_DEBEN" ? "bg-income text-income-foreground" : "bg-expense text-expense-foreground"
                              }`}
                              aria-label="Agregar pago"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : h.pagos.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Se marcó como pagado directo, sin cuotas.</p>
                        ) : null}
                        {errorPago && expandido && (
                          <p className="text-[11px] text-destructive">{errorPago}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {historial.length === 0 && (
                <p className="text-[12px] text-muted-foreground">Sin movimientos todavía.</p>
              )}
            </div>

            {seleccionados.size > 0 ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => setSeleccionados(new Set())}
                  variant="secondary"
                  className="flex-1 rounded-xl py-3 h-auto text-[14px] font-medium shadow-none"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaldarSeleccionados}
                  disabled={saldandoSeleccion}
                  className={`flex-1 rounded-xl py-3 h-auto text-[14px] font-medium ${
                    teDeben ? "bg-income text-income-foreground hover:bg-income/90" : "bg-expense text-expense-foreground hover:bg-expense/90"
                  }`}
                >
                  <Check size={16} /> {saldandoSeleccion ? "Guardando..." : "Marcar como pagado"}
                </Button>
              </div>
            ) : (
              historial.some((h) => h.estado === "pendiente") && (
                <Button
                  onClick={handleSaldar}
                  disabled={saldando}
                  className={`w-full rounded-xl py-3 h-auto text-[14px] font-medium ${
                    teDeben ? "bg-income text-income-foreground hover:bg-income/90" : "bg-expense text-expense-foreground hover:bg-expense/90"
                  }`}
                >
                  <Check size={16} /> {saldando ? "Guardando..." : "Marcar todo como pagado"}
                </Button>
              )
            )}
            {seleccionados.size === 0 && historial.some((h) => h.estado === "pendiente") && (
              <p className="text-[10.5px] text-center mt-2 text-muted-foreground">
                Marcá el cuadrado para pagar un movimiento entero, o tocalo para pagarlo en cuotas.
              </p>
            )}
          </>
        )}
      </div>
    </div>
    {editando && (
      <DeudaModal
        deuda={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          onChanged();
          refrescar();
        }}
      />
    )}
    </>
  );
}
