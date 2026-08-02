import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { THEME_LABELS, type ThemeName } from "@/lib/theme";

export const dynamic = "force-dynamic";

const TEMAS_VALIDOS = Object.keys(THEME_LABELS) as ThemeName[];

// PATCH /api/usuario → guarda el tema elegido en el selector de UI
export async function PATCH(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const { tema } = await request.json();
    if (!TEMAS_VALIDOS.includes(tema)) {
      return NextResponse.json({ error: "Tema inválido" }, { status: 400 });
    }

    await sql`UPDATE usuarios SET tema = ${tema} WHERE id = ${usuarioId}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/usuario:", error);
    return NextResponse.json({ error: "No se pudo guardar el tema" }, { status: 500 });
  }
}
