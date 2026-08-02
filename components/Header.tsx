"use client";

import { signOut } from "next-auth/react";
import { Plus, ChevronLeft, Palette, LogOut } from "lucide-react";
import { THEME_LABELS, type ThemeName } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function Header({
  title, themeName, usuario, onOpenTema, onOpenNuevo,
}: {
  title?: string; themeName: ThemeName;
  usuario: { nombre: string; email: string };
  onOpenTema: () => void; onOpenNuevo: () => void;
}) {
  return (
    <div className="px-5 lg:px-0 pt-8 lg:pt-0 flex items-center justify-between">
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
            <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">Buenas tardes</p>
            <p className="text-[14px] lg:text-[18px] font-semibold text-foreground">{usuario.nombre}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenTema}
          variant="secondary"
          size="icon"
          className="lg:w-auto lg:h-auto lg:px-4 lg:py-2 rounded-full shadow-none"
        >
          <Palette size={16} />
          <span className="hidden lg:inline text-[13px] font-medium">{THEME_LABELS[themeName]}</span>
        </Button>
        <Button onClick={onOpenNuevo} variant="secondary" size="icon" className="rounded-full shadow-none" aria-label="Nuevo">
          <Plus size={17} />
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
  );
}
