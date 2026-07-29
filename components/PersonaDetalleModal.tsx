"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2, Square, CheckSquare, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Theme } from "@/lib/theme";

type Pago = { id: number; monto: string; fecha: string };

type DeudaHistorial = {
  id: number;
  tipo: "ME_DEBEN" | "YO_DEBO";
  monto: string;
  descripcion: string;
  fecha: string;
  estado: "pendiente" | "saldado";
  saldado_en: string | null;
  pagado: string;
  pagos: Pago[];
};

const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PersonaDetalleModal({
  t,
  personaId,
  onClose,
  onChanged,
}: {
  t: Theme;
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
    const montoNum = Number(montoPago);
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
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[440px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: t.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full text-white flex items-center justify-center text-[12px] font-semibold"
              style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent }}
            >
              {nombre[0] || "?"}
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>{nombre}</p>
              {neto !== 0 && (
                <p className="text-[11px]" style={{ color: teDeben ? t.ingresoAccent : t.gastoAccent }}>
                  {teDeben ? "Te debe" : "Le debés"} {fmt(Math.abs(neto))}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        {loading ? (
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>Cargando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] tracking-wide uppercase" style={{ color: t.textSecondary }}>Historial</p>
              {seleccionados.size > 0 && (
                <p className="text-[11px]" style={{ color: t.textSecondary }}>
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
                const accent = h.tipo === "ME_DEBEN" ? t.ingresoAccent : t.gastoAccent;

                return (
                  <div key={h.id} className="border-b last:border-0" style={{ borderColor: t.divider }}>
                    <div className="flex items-center gap-3 py-2.5 group">
                      {seleccionable && (
                        <button
                          onClick={() => toggleSeleccion(h.id)}
                          className="shrink-0 p-1 -m-1"
                          aria-label={marcado ? "Quitar de la selección" : "Seleccionar"}
                        >
                          {marcado ? (
                            <CheckSquare size={18} style={{ color: teDeben ? t.ingresoAccent : t.gastoAccent }} />
                          ) : (
                            <Square size={18} style={{ color: t.textSecondary }} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpandir(h.id)}
                        className="flex-1 min-w-0 text-left flex items-center gap-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[12.5px]"
                            style={{ color: h.estado === "saldado" ? t.textSecondary : t.textPrimary, textDecoration: h.estado === "saldado" ? "line-through" : "none" }}
                          >
                            {h.descripcion}
                          </p>
                          <p className="text-[10px]" style={{ color: t.textSecondary }}>
                            {new Date(h.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                            {h.estado === "saldado" && " · saldado"}
                            {h.estado === "pendiente" && pagado > 0 && ` · ${h.tipo === "ME_DEBEN" ? "pagó" : "pagaste"} ${fmt(pagado)}`}
                          </p>
                        </div>
                        {expandido ? (
                          <ChevronUp size={13} style={{ color: t.textSecondary }} />
                        ) : (
                          <ChevronDown size={13} style={{ color: t.textSecondary }} />
                        )}
                      </button>
                      <p className="text-[12.5px] font-semibold" style={{ color: h.estado === "saldado" ? t.textSecondary : accent }}>
                        {h.tipo === "ME_DEBEN" ? "+" : "-"}{fmt(h.estado === "pendiente" ? saldoPendiente : Number(h.monto))}
                      </p>
                      <button onClick={() => handleDeleteEntry(h.id)} className="shrink-0" aria-label="Eliminar">
                        <Trash2 size={13} style={{ color: t.textSecondary }} />
                      </button>
                    </div>

                    {expandido && (
                      <div className="pb-3 pl-1 space-y-2">
                        {h.pagos.length > 0 && (
                          <div className="space-y-1">
                            {h.pagos.map((pg) => (
                              <div key={pg.id} className="flex items-center gap-2 text-[11.5px]" style={{ color: t.textSecondary }}>
                                <span className="flex-1">
                                  {new Date(pg.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — {fmt(Number(pg.monto))}
                                </span>
                                <button onClick={() => handleEliminarPago(pg.id)} aria-label="Deshacer pago">
                                  <Trash2 size={12} style={{ color: t.textSecondary }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {h.estado === "pendiente" ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={montoPago}
                              onChange={(e) => setMontoPago(e.target.value.replace(/[^0-9.]/g, ""))}
                              placeholder={`Saldo: ${fmt(saldoPendiente)}`}
                              inputMode="decimal"
                              className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none"
                              style={{ backgroundColor: t.surface, color: t.textPrimary }}
                            />
                            <button
                              onClick={() => handleAgregarPago(h.id)}
                              disabled={enviandoPago}
                              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-60"
                              style={{ backgroundColor: accent, color: t.bg }}
                              aria-label="Agregar pago"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : h.pagos.length === 0 ? (
                          <p className="text-[11px]" style={{ color: t.textSecondary }}>Se marcó como pagado directo, sin cuotas.</p>
                        ) : null}
                        {errorPago && expandido && (
                          <p className="text-[11px]" style={{ color: t.gastoAccent }}>{errorPago}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {historial.length === 0 && (
                <p className="text-[12px]" style={{ color: t.textSecondary }}>Sin movimientos todavía.</p>
              )}
            </div>

            {seleccionados.size > 0 ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setSeleccionados(new Set())}
                  className="flex-1 rounded-xl py-3 text-[14px] font-medium"
                  style={{ backgroundColor: t.surface, color: t.textPrimary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaldarSeleccionados}
                  disabled={saldandoSeleccion}
                  className="flex-1 rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent, color: t.bg }}
                >
                  <Check size={16} /> {saldandoSeleccion ? "Guardando..." : "Marcar como pagado"}
                </button>
              </div>
            ) : (
              neto !== 0 && (
                <button
                  onClick={handleSaldar}
                  disabled={saldando}
                  className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent, color: t.bg }}
                >
                  <Check size={16} /> {saldando ? "Guardando..." : "Marcar todo como pagado"}
                </button>
              )
            )}
            {seleccionados.size === 0 && historial.some((h) => h.estado === "pendiente") && (
              <p className="text-[10.5px] text-center mt-2" style={{ color: t.textSecondary }}>
                Marcá el cuadrado para pagar un movimiento entero, o tocalo para pagarlo en cuotas.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
