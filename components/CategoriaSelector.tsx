"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { CategoriaConId } from "@/lib/mockData";

// clip a 3 renglones de chips (~32px cada uno + 8px de gap) hasta que se
// despliegue el resto a pedido
const ALTO_3_RENGLONES = 112;

export function CategoriaSelector({
  categorias, categoriaId, onSelect, onAgregarNueva,
}: {
  categorias: CategoriaConId[];
  categoriaId: number | null;
  onSelect: (id: number | null) => void;
  onAgregarNueva: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [necesitaExpandir, setNecesitaExpandir] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listaRef.current) {
      setNecesitaExpandir(listaRef.current.scrollHeight > ALTO_3_RENGLONES + 1);
    }
  }, [categorias]);

  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoría</label>
      <div
        ref={listaRef}
        className={`flex gap-2 flex-wrap mt-2 overflow-hidden transition-[max-height] duration-300 ease-out ${expandido ? "max-h-[600px]" : "max-h-[112px]"}`}
      >
        {categorias.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => onSelect(categoriaId === c.id ? null : c.id)}
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
        {categorias.length === 0 && (
          <p className="text-[12px] text-muted-foreground">Cargando categorías...</p>
        )}
      </div>
      <div className="flex gap-2 flex-wrap mt-2">
        {necesitaExpandir && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium border border-dashed text-muted-foreground"
          >
            <ChevronDown size={13} className={expandido ? "rotate-180" : ""} />
            {expandido ? "Ver menos" : "Ver más"}
          </button>
        )}
        <button
          type="button"
          onClick={onAgregarNueva}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium border border-dashed text-muted-foreground"
        >
          <Plus size={13} /> Nueva
        </button>
      </div>
    </div>
  );
}
