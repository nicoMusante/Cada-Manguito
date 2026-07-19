"use client";

import { useState } from "react";
import { THEMES } from "@/lib/theme";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView } from "@/components/PersonasView";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [dark, setDark] = useState(false);
  const t = THEMES[dark ? "dark" : "light"];

  const content = {
    resumen: <ResumenView t={t} />,
    movimientos: <MovimientosView t={t} />,
    personas: <PersonasView t={t} />,
  }[tab];

  const titles: Record<TabId, string | undefined> = {
    resumen: undefined,
    movimientos: "Movimientos",
    personas: "Personas",
  };

  return (
    <main style={{ backgroundColor: t.outerBg, minHeight: "100vh" }}>
      {/* Contenedor: tarjeta centrada en mobile, dashboard ancho en desktop */}
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div
          className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8"
          style={{ backgroundColor: t.bg }}
        >
          <Sidebar t={t} active={tab} onChange={setTab} />

          <div className="flex-1 pb-24 lg:pb-0">
            <Header t={t} title={titles[tab]} dark={dark} onToggleDark={() => setDark((d) => !d)} />
            {content}
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={setTab} />
    </main>
  );
}
