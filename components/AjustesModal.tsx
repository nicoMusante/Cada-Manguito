"use client";

import { useState } from "react";
import { Check, X, Palette, DollarSign, ChevronDown, Download } from "lucide-react";
import { THEME_LABELS, THEME_SWATCHES, THEME_FAMILIES, THEME_MODE, type ThemeName } from "@/lib/theme";
import { DOLAR_LABELS, type DolarTipo } from "@/lib/dolar";

const DOLARES = Object.keys(DOLAR_LABELS) as DolarTipo[];

type Seccion = "apariencia" | "moneda";

function SeccionAjuste({
  icon: Icon, titulo, valorActual, abierta, onToggle, children,
}: {
  icon: typeof Palette; titulo: string; valorActual: string;
  abierta: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5"
      >
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <Icon size={14} className="text-muted-foreground" /> {titulo}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {valorActual}
          <ChevronDown size={15} className={`transition-transform ${abierta ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: abierta ? "1fr" : "0fr",
          transition: "grid-template-rows 0.25s ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-1.5 px-3.5 pb-3.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AjustesModal({
  temaActual, dolarActual, onSelectTema, onSelectDolar, onClose,
}: {
  temaActual: ThemeName;
  dolarActual: DolarTipo;
  onSelectTema: (name: ThemeName) => void;
  onSelectDolar: (tipo: DolarTipo) => void;
  onClose: () => void;
}) {
  const modoActual = THEME_MODE[temaActual];
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion | null>(null);

  function toggleSeccion(s: Seccion) {
    setSeccionAbierta((prev) => (prev === s ? null : s));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 max-h-[85vh] overflow-y-auto bg-card animate-in fade-in-0 slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">Ajustes</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <SeccionAjuste
            icon={Palette}
            titulo="Apariencia"
            valorActual={THEME_LABELS[temaActual]}
            abierta={seccionAbierta === "apariencia"}
            onToggle={() => toggleSeccion("apariencia")}
          >
            {THEME_FAMILIES.map((familia) => {
              // se muestra y aplica la variante que corresponde al modo
              // claro/oscuro activo — el modo se cambia aparte, desde la
              // barra de sol/luna del header
              const name = modoActual === "claro" ? familia.claro : familia.oscuro;
              const swatch = THEME_SWATCHES[name];
              const selected = name === temaActual;
              return (
                <button
                  key={name}
                  onClick={() => onSelectTema(name)}
                  className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 border bg-secondary"
                  style={{ borderColor: selected ? swatch.accent : "transparent" }}
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: swatch.accent, boxShadow: `0 0 0 3px ${swatch.bg}, 0 0 0 4px ${swatch.ring}` }}
                  />
                  <span className="flex-1 text-left text-[13.5px] text-foreground">{THEME_LABELS[name]}</span>
                  {selected && <Check size={16} style={{ color: swatch.accent }} />}
                </button>
              );
            })}
          </SeccionAjuste>

          <SeccionAjuste
            icon={DollarSign}
            titulo="Dólar usado"
            valorActual={DOLAR_LABELS[dolarActual]}
            abierta={seccionAbierta === "moneda"}
            onToggle={() => toggleSeccion("moneda")}
          >
            {DOLARES.map((tipo) => {
              const selected = tipo === dolarActual;
              return (
                <button
                  key={tipo}
                  onClick={() => onSelectDolar(tipo)}
                  className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 border bg-secondary"
                  style={{ borderColor: selected ? "hsl(var(--primary))" : "transparent" }}
                >
                  <span className="text-[13px] text-foreground">{DOLAR_LABELS[tipo]}</span>
                  {selected && <Check size={15} className="text-primary" />}
                </button>
              );
            })}
          </SeccionAjuste>

          <a
            href="/api/movimientos/export"
            download
            className="w-full flex items-center gap-1.5 rounded-2xl border border-border p-3.5 text-[13px] font-medium text-foreground"
          >
            <Download size={14} className="text-muted-foreground" /> Exportar movimientos (CSV)
          </a>
        </div>
      </div>
    </div>
  );
}
