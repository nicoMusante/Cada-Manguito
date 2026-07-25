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
import { PersonasView, type PersonaActiva, type DeudaSaldada } from "@/components/PersonasView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";
import { CategoriaModal } from "@/components/CategoriaModal";
import { DeudaModal } from "@/components/DeudaModal";
import { PersonaDetalleModal } from "@/components/PersonaDetalleModal";
import { MobileShell } from "@/components/MobileShell";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [dark, setDark] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [personasActivas, setPersonasActivas] = useState<PersonaActiva[]>([]);
  const [personasSaldadas, setPersonasSaldadas] = useState<DeudaSaldada[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [categoriaModalAbierta, setCategoriaModalAbierta] = useState(false);
  const [deudaModalAbierta, setDeudaModalAbierta] = useState(false);
  const [personaDetalleId, setPersonaDetalleId] = useState<number | null>(null);
  const t = THEMES[dark ? "dark" : "light"];

  const cargarMovimientos = useCallback(() => {
    setLoading(true);
    return fetch("/api/movimientos", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: MovimientoRow[]) => setMovimientos(rows.map(mapMovimiento)))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  }, []);

  const cargarCategorias = useCallback(() => {
    return fetch("/api/categorias", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => setCategorias(rows.map(mapCategoria)))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const cargarPersonas = useCallback(() => {
    setLoadingPersonas(true);
    return fetch("/api/personas", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPersonasActivas(data.activas ?? []);
        setPersonasSaldadas(data.saldadas ?? []);
      })
      .catch((err) => console.error("Error al cargar personas:", err))
      .finally(() => setLoadingPersonas(false));
  }, []);

  // Versión "silenciosa" para pull-to-refresh: no dispara los estados de loading
  // (que harían parpadear la lista a "Cargando..." mientras arrastrás el dedo).
  const refrescarSilencioso = useCallback(async () => {
    const [movRows, catRows, personasData] = await Promise.all([
      fetch("/api/movimientos", { cache: "no-store" }).then((r) => r.json()) as Promise<MovimientoRow[]>,
      fetch("/api/categorias", { cache: "no-store" }).then((r) => r.json()) as Promise<CategoriaRow[]>,
      fetch("/api/personas", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setMovimientos(movRows.map(mapMovimiento));
    setCategorias(catRows.map(mapCategoria));
    setPersonasActivas(personasData.activas ?? []);
    setPersonasSaldadas(personasData.saldadas ?? []);
  }, []);

  useEffect(() => {
    cargarMovimientos();
    cargarCategorias();
    cargarPersonas();
  }, [cargarMovimientos, cargarCategorias, cargarPersonas]);

  const abrirEdicion = (m: Movimiento) => setModal({ mode: "edit", movimiento: m });

  const meDeben = personasActivas.filter((p) => Number(p.neto) > 0).reduce((acc, p) => acc + Number(p.neto), 0);
  const yoDebo = Math.abs(personasActivas.filter((p) => Number(p.neto) < 0).reduce((acc, p) => acc + Number(p.neto), 0));

  const alGuardarMovimiento = () => {
    cargarMovimientos();
    cargarPersonas();
  };

  const resumenPanel = (
    <ResumenView
      t={t}
      movimientos={movimientos}
      loading={loading}
      categorias={categorias}
      meDeben={meDeben}
      yoDebo={yoDebo}
      onSelectMovimiento={abrirEdicion}
      onAddCategoria={() => setCategoriaModalAbierta(true)}
    />
  );
  const movimientosPanel = (
    <MovimientosView t={t} movimientos={movimientos} loading={loading} onSelectMovimiento={abrirEdicion} />
  );
  const personasPanel = (
    <PersonasView
      t={t}
      activas={personasActivas}
      saldadas={personasSaldadas}
      loading={loadingPersonas}
      onSelectPersona={setPersonaDetalleId}
      onChanged={cargarPersonas}
    />
  );

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

  const abrirNuevo = () => {
    if (tab === "personas") setDeudaModalAbierta(true);
    else setModal({ mode: "new" });
  };

  const modalAbierto = modal.mode !== "closed" || categoriaModalAbierta || deudaModalAbierta || personaDetalleId !== null;

  return (
    <main style={{ backgroundColor: t.outerBg, minHeight: "100vh" }}>
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8" style={{ backgroundColor: t.bg }}>
          {/* Desktop: sidebar + panel único */}
          <Sidebar t={t} active={tab} onChange={setTab} />
          <div className="hidden lg:block flex-1">
            <Header t={t} title={titles[tab]} dark={dark} onToggleDark={() => setDark((d) => !d)} onOpenNuevo={abrirNuevo} />
            {panelesPorTab[tab]}
          </div>

          {/* Mobile: swipe entre pestañas en cualquier parte de la pantalla + pull-to-refresh */}
          <div className="lg:hidden">
            <MobileShell
              t={t}
              header={
                <Header t={t} title={titles[tab]} dark={dark} onToggleDark={() => setDark((d) => !d)} onOpenNuevo={abrirNuevo} />
              }
              index={TAB_IDS.indexOf(tab)}
              onIndexChange={(i) => setTab(TAB_IDS[i])}
              disabled={modalAbierto}
              onRefresh={refrescarSilencioso}
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
          onSaved={alGuardarMovimiento}
        />
      )}

      {categoriaModalAbierta && (
        <CategoriaModal t={t} onClose={() => setCategoriaModalAbierta(false)} onCreated={cargarCategorias} />
      )}

      {deudaModalAbierta && (
        <DeudaModal t={t} onClose={() => setDeudaModalAbierta(false)} onSaved={cargarPersonas} />
      )}

      {personaDetalleId !== null && (
        <PersonaDetalleModal
          t={t}
          personaId={personaDetalleId}
          onClose={() => setPersonaDetalleId(null)}
          onChanged={cargarPersonas}
        />
      )}
    </main>
  );
}
