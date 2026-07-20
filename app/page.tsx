"use client";

import { useCallback, useEffect, useState } from "react";
import { THEMES } from "@/lib/theme";
import {
  mapMovimiento, mapCategoria,
  type Movimiento, type MovimientoRow,
  type CategoriaConId, type CategoriaRow,
} from "@/lib/mockData";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView } from "@/components/PersonasView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";
import { CategoriaModal } from "@/components/CategoriaModal";
import { MobileCarousel } from "@/components/MobileCarousel";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [dark, setDark] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [categoriaModalAbierta, setCategoriaModalAbierta] = useState(false);
  const t = THEMES[dark ? "dark" : "light"];

  const cargarMovimientos = useCallback(() => {
    setLoading(true);
    fetch("/api/movimientos", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: MovimientoRow[]) => setMovimientos(rows.map(mapMovimiento)))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  }, []);

  const cargarCategorias = useCallback(() => {
    fetch("/api/categorias", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => setCategorias(rows.map(mapCategoria)))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  useEffect(() => {
    cargarMovimientos();
    cargarCategorias();
  }, [cargarMovimientos, cargarCategorias]);

  const abrirEdicion = (m: Movimiento) => setModal({ mode: "edit", movimiento: m });

  const resumenPanel = (
    <ResumenView
      t={t}
      movimientos={movimientos}
      loading={loading}
      categorias={categorias}
      onSelectMovimiento={abrirEdicion}
      onAddCategoria={() => setCategoriaModalAbierta(true)}
    />
  );
  const movimientosPanel = (
    <MovimientosView t={t} movimientos={movimientos} loading={loading} onSelectMovimiento={abrirEdicion} />
  );
  const personasPanel = <PersonasView t={t} />;

  const panelesPorTab: Record<TabId, React.ReactNode> = {
    resumen: resumenPanel,
    movimientos: movimientosPanel,
    personas: personasPanel,
  };

  const titles: Record<TabId, string | undefined> = {
    resumen: undefined,
    movimientos: "Movimientos",
    personas: "Personas",
  };

  const modalAbierto = modal.mode !== "closed" || categoriaModalAbierta;

  return (
    <main style={{ backgroundColor: t.outerBg, minHeight: "100vh" }}>
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8" style={{ backgroundColor: t.bg }}>
          {/* Desktop: sidebar + panel único, tal como estaba */}
          <Sidebar t={t} active={tab} onChange={setTab} />
          <div className="hidden lg:block flex-1">
            <Header
              t={t}
              title={titles[tab]}
              dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onOpenNuevo={() => setModal({ mode: "new" })}
            />
            {panelesPorTab[tab]}
          </div>

          {/* Mobile: header + carrusel que sigue el dedo en vivo */}
          <div className="lg:hidden flex-1 pb-24">
            <Header
              t={t}
              title={titles[tab]}
              dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onOpenNuevo={() => setModal({ mode: "new" })}
            />
            <MobileCarousel
              index={TAB_IDS.indexOf(tab)}
              onIndexChange={(i) => setTab(TAB_IDS[i])}
              disabled={modalAbierto}
              panels={[resumenPanel, movimientosPanel, personasPanel]}
            />
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={setTab} />

      {modal.mode !== "closed" && (
        <MovimientoModal
          t={t}
          movimiento={modal.mode === "edit" ? modal.movimiento : null}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={cargarMovimientos}
        />
      )}

      {categoriaModalAbierta && (
        <CategoriaModal t={t} onClose={() => setCategoriaModalAbierta(false)} onCreated={cargarCategorias} />
      )}
    </main>
  );
}
