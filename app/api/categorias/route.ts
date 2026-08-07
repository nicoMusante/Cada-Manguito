import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/categorias → categorías activas, para poblar el formulario de nuevo movimiento
export async function GET() {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    // ordeno por uso (categorías con más movimientos primero) y a igualdad
    // de uso, alfabético
    const rows = await sql`
      SELECT c.id, c.nombre, c.tipo, c.color_hex, c.icono
      FROM categorias c
      LEFT JOIN movimientos m ON m.categoria_id = c.id AND m.usuario_id = c.usuario_id
      WHERE c.activo = true AND c.usuario_id = ${usuarioId}
      GROUP BY c.id
      ORDER BY COUNT(m.id) DESC, c.nombre ASC
    `;
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error en GET /api/categorias:", error);
    return NextResponse.json({ error: "No se pudieron obtener las categorías" }, { status: 500 });
  }
}

// POST /api/categorias → crea una categoría nueva
export async function POST(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const body = await request.json();
    const { nombre, tipo, color_hex, icono } = body;

    if (!nombre?.trim() || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos: nombre, tipo" }, { status: 400 });
    }
    if (tipo !== "GASTO" && tipo !== "INGRESO") {
      return NextResponse.json({ error: "tipo debe ser GASTO o INGRESO" }, { status: 400 });
    }

    const rows = await sql`
      SELECT crear_categoria(${usuarioId}, ${nombre.trim()}, ${tipo}, ${color_hex ?? null}, ${icono ?? null}) AS id
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/categorias:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear la categoría";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}

