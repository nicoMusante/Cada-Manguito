import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { THEME_LABELS, type ThemeName } from "@/lib/theme";
import { DOLAR_LABELS, type DolarTipo } from "@/lib/dolar";

export const dynamic = "force-dynamic";

const TEMAS_VALIDOS = Object.keys(THEME_LABELS) as ThemeName[];
const DOLARES_VALIDOS = Object.keys(DOLAR_LABELS) as DolarTipo[];

// PATCH /api/usuario → guarda las preferencias elegidas en Ajustes (tema y/o tipo de dólar)
export async function PATCH(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const { tema, tipo_dolar } = await request.json();

    if (tema !== undefined) {
      if (!TEMAS_VALIDOS.includes(tema)) {
        return NextResponse.json({ error: "Tema inválido" }, { status: 400 });
      }
      await sql`UPDATE usuarios SET tema = ${tema} WHERE id = ${usuarioId}`;
    }

    if (tipo_dolar !== undefined) {
      if (!DOLARES_VALIDOS.includes(tipo_dolar)) {
        return NextResponse.json({ error: "Tipo de dólar inválido" }, { status: 400 });
      }
      await sql`UPDATE usuarios SET tipo_dolar = ${tipo_dolar} WHERE id = ${usuarioId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/usuario:", error);
    return NextResponse.json({ error: "No se pudo guardar la preferencia" }, { status: 500 });
  }
}
