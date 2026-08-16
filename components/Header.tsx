"use client";

import { signOut } from "next-auth/react";
import { ChevronLeft, Sun, Moon, Settings, LogOut } from "lucide-react";
import { THEME_MODE, type ThemeName } from "@/lib/theme";
import { saludoActualAr } from "@/lib/periodo";
import { Button } from "@/components/ui/button";

// barra de sol/luna: cambia entre claro y oscuro sin tocar la gama de
// colores elegida en Ajustes (ej. Café ↔ Terracota)
function ModoToggle({ themeName, onToggle }: { themeName: ThemeName; onToggle: () => void }) {
  const esClaro = THEME_MODE[themeName] === "claro";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={esClaro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="relative w-14 h-8 rounded-full bg-secondary shrink-0"
    >
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground transition-all duration-200 ${
          esClaro ? "left-1" : "left-7"
        }`}
      >
        {esClaro ? <Sun size={13} /> : <Moon size={13} />}
      </span>
    </button>
  );
}

export function Header({
  title, themeName, usuario, onToggleModo, onOpenAjustes,
}: {
  title?: string; themeName: ThemeName;
  usuario: { nombre: string; email: string };
  onToggleModo: () => void; onOpenAjustes: () => void;
}) {
  return (
    <div className="pt-8 lg:pt-0">
      {/* min-h fija la altura del renglón, así el header no cambia de tamaño
          entre la pestaña Resumen (avatar + saludo) y el resto (título simple) */}
      <div className="px-5 lg:px-0 flex items-center justify-between min-h-[44px] lg:min-h-[48px]">
        {title ? (
          <div className="flex items-center gap-2.5">
            <ChevronLeft size={19} className="lg:hidden text-foreground" />
            <p className="text-[15px] lg:text-[20px] font-semibold text-foreground">{title}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-[21px] lg:text-[24px] bg-primary">
              👋
            </div>
            <div>
              <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">{saludoActualAr()}</p>
              <p className="text-[14px] lg:text-[18px] font-semibold text-foreground">{usuario.nombre}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ModoToggle themeName={themeName} onToggle={onToggleModo} />
          <Button onClick={onOpenAjustes} variant="secondary" size="icon" className="rounded-full shadow-none" aria-label="Ajustes">
            <Settings size={16} />
          </Button>
          <Button
            onClick={() => {
              if (confirm("¿Cerrar sesión?")) signOut({ callbackUrl: "/login" });
            }}
            variant="secondary"
            size="icon"
            className="rounded-full shadow-none"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
