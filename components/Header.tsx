"use client";

import { signOut } from "next-auth/react";
import { Plus, ChevronLeft, Palette, LogOut } from "lucide-react";
import { THEME_LABELS, type Theme, type ThemeName } from "@/lib/theme";

export function Header({
  t, title, themeName, usuario, onOpenTema, onOpenNuevo,
}: {
  t: Theme; title?: string; themeName: ThemeName;
  usuario: { nombre: string; email: string };
  onOpenTema: () => void; onOpenNuevo: () => void;
}) {
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="px-5 lg:px-0 pt-8 lg:pt-0 flex items-center justify-between">
      {title ? (
        <div className="flex items-center gap-2.5">
          <ChevronLeft size={19} className="lg:hidden" style={{ color: t.textPrimary }} />
          <p className="text-[15px] lg:text-[20px] font-semibold" style={{ color: t.textPrimary }}>{title}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-semibold lg:text-lg" style={{ backgroundColor: t.avatarBg }}>{inicial}</div>
          <div>
            <p className="text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>Buenas tardes</p>
            <p className="text-[14px] lg:text-[18px] font-semibold" style={{ color: t.textPrimary }}>{usuario.nombre}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenTema}
          className="w-9 h-9 lg:w-auto lg:h-auto flex items-center justify-center gap-2 rounded-full lg:px-4 lg:py-2 text-[13px] font-medium"
          style={{ backgroundColor: t.surface, color: t.textPrimary }}
        >
          <Palette size={16} />
          <span className="hidden lg:inline">{THEME_LABELS[themeName]}</span>
        </button>
        <button onClick={onOpenNuevo} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
          <Plus size={17} style={{ color: t.textPrimary }} />
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: t.surface }}
          title="Cerrar sesión"
        >
          <LogOut size={16} style={{ color: t.textPrimary }} />
        </button>
      </div>
    </div>
  );
}
