import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/categorias → categorías activas, para poblar el formulario de nuevo movimiento
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, nombre, tipo, color_hex, icono
      FROM categorias
      WHERE activo = true
      ORDER BY tipo, nombre
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error en GET /api/categorias:", error);
    return NextResponse.json({ error: "No se pudieron obtener las categorías" }, { status: 500 });
  }
}
