"use client";

import { Plus, ChevronLeft, Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/theme";

export function Header({
  t,
  title,
  dark,
  onToggleDark,
}: {
  t: Theme;
  title?: string;
  dark: boolean;
  onToggleDark: () => void;
}) {
  return (
    <div className="px-5 lg:px-0 pt-8 lg:pt-0 flex items-center justify-between">
      {title ? (
        <div className="flex items-center gap-2.5">
          <ChevronLeft size={19} className="lg:hidden" style={{ color: t.textPrimary }} />
          <p className="text-[15px] lg:text-[20px] font-semibold" style={{ color: t.textPrimary }}>{title}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-semibold lg:text-lg"
            style={{ backgroundColor: t.avatarBg }}
          >
            N
          </div>
          <div>
            <p className="text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>Buenas tardes</p>
            <p className="text-[14px] lg:text-[18px] font-semibold" style={{ color: t.textPrimary }}>Nico</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium"
          style={{ backgroundColor: t.surface, color: t.textPrimary }}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? "Tema claro" : "Tema oscuro"}
        </button>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: t.surface }}
        >
          <Plus size={17} style={{ color: t.textPrimary }} />
        </button>
      </div>
    </div>
  );
}
