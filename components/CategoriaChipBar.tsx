"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X, Check } from "lucide-react";
import type { CategoriaConId } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";

// anchos variados para que el placeholder no se vea como una fila de
// rectángulos idénticos mientras esperamos el GET de categorías
const ANCHOS_SKELETON = [88, 64, 104, 76];

// cuánto tiempo queda "armada" la confirmación de borrado antes de cancelarse
// sola, para que un toque accidental en la x no deje el chip pidiendo
// confirmación para siempre
const MS_AUTOCANCELAR_BORRADO = 4000;

// cantidad de categorías visibles antes de tener que desplegar el resto
const CAP_CATEGORIAS = 7;

// barra de chips de categoría reutilizada en Resumen, Movimientos y el panel
// de filtros de Gráficos. onAddCategoria/onEliminarCategoria son opcionales:
// sin ellos, la barra queda en modo sólo-filtro (así la usa Gráficos, donde
// no tiene sentido crear/borrar categorías desde un panel de filtro).
export function CategoriaChipBar({
  categorias, seleccionadas, sinCategoria, onToggleCategoria, onToggleSinCategoria,
  onAddCategoria, onEliminarCategoria, loading,
}: {
  categorias: CategoriaConId[];
  seleccionadas: Set<number>;
  sinCategoria: boolean;
  onToggleCategoria: (id: number) => void;
  onToggleSinCategoria: () => void;
  onAddCategoria?: () => void;
  onEliminarCategoria?: (id: number) => void;
  loading?: boolean;
}) {
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<number | null>(null);
  const [expandido, setExpandido] = useState(false);
  const chipConfirmandoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (confirmarEliminarId === null) return;
    const timer = setTimeout(() => setConfirmarEliminarId(null), MS_AUTOCANCELAR_BORRADO);
    return () => clearTimeout(timer);
  }, [confirmarEliminarId]);

  // si el usuario toca en cualquier otra parte de la pantalla mientras hay
  // una confirmación de borrado armada, la cancelo al toque en vez de dejar
  // que se cierre sola por el timer — así un toque accidental en la x se
  // resuelve de inmediato al tocar afuera, no hay que esperar
  useEffect(() => {
    if (confirmarEliminarId === null) return;
    function handlePointerDown(e: PointerEvent) {
      if (chipConfirmandoRef.current && !chipConfirmandoRef.current.contains(e.target as Node)) {
        setConfirmarEliminarId(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [confirmarEliminarId]);

  function confirmarEliminar(id: number) {
    onEliminarCategoria?.(id);
    setConfirmarEliminarId(null);
  }

  if (loading && categorias.length === 0) {
    return (
      <>
        {ANCHOS_SKELETON.map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full shrink-0" style={{ width: w }} />
        ))}
      </>
    );
  }

  const hayFiltro = seleccionadas.size > 0 || sinCategoria;
  const visibles = expandido ? categorias : categorias.slice(0, CAP_CATEGORIAS);

  return (
    <>
      {visibles.map((c) => {
        const seleccionada = seleccionadas.has(c.id);
        const confirmando = confirmarEliminarId === c.id;
        return (
          <div key={c.id} ref={confirmando ? chipConfirmandoRef : undefined} className="relative shrink-0">
            {seleccionada && !confirmando && <div className="chip-etiqueta-ring" aria-hidden />}
            <div
              className="chip-etiqueta relative flex items-center gap-1.5 pr-2 py-2 text-white transition"
              style={{
                backgroundColor: confirmando ? "hsl(var(--expense))" : c.color,
                opacity: hayFiltro && !seleccionada && !confirmando ? 0.45 : 1,
              }}
            >
              <span className="chip-etiqueta-agujero" />
              <button
                type="button"
                onClick={() => onToggleCategoria(c.id)}
                disabled={confirmando}
                aria-pressed={seleccionada}
                aria-label={`Filtrar por ${c.name}`}
                className="flex items-center gap-1.5"
              >
                <c.icon size={13} />
                <span className="text-[11.5px]">{confirmando ? `¿Eliminar ${c.name}?` : c.name}</span>
              </button>
              {onEliminarCategoria && (
                confirmando ? (
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => confirmarEliminar(c.id)}
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                      aria-label={`Confirmar eliminar categoría ${c.name}`}
                    >
                      <Check size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarEliminarId(null)}
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
                      aria-label="Cancelar"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminarId(c.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
                    aria-label={`Eliminar categoría ${c.name}`}
                  >
                    <X size={9} />
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}

      {categorias.length > CAP_CATEGORIAS && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border border-dashed border-muted-foreground/50 text-muted-foreground"
        >
          <ChevronDown size={13} className={expandido ? "rotate-180" : ""} />
          <span className="text-[11.5px]">{expandido ? "Ver menos" : "Ver más"}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onToggleSinCategoria}
        aria-pressed={sinCategoria}
        className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border border-dashed text-[11.5px]"
        style={{
          borderColor: sinCategoria ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.5)",
          color: sinCategoria ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          opacity: hayFiltro && !sinCategoria ? 0.45 : 1,
        }}
      >
        Sin categoría
      </button>

      {onAddCategoria && (
        <button
          type="button"
          onClick={onAddCategoria}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border border-dashed border-muted-foreground/50 text-muted-foreground"
        >
          <Plus size={13} />
          <span className="text-[11.5px]">Categoría</span>
        </button>
      )}
    </>
  );
}
