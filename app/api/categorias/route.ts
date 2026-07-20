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

// POST /api/categorias → crea una categoría nueva
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, tipo, color_hex, icono } = body;

    if (!nombre?.trim() || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos: nombre, tipo" }, { status: 400 });
    }
    if (tipo !== "GASTO" && tipo !== "INGRESO") {
      return NextResponse.json({ error: "tipo debe ser GASTO o INGRESO" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO categorias (nombre, tipo, color_hex, icono)
      VALUES (${nombre.trim()}, ${tipo}, ${color_hex ?? null}, ${icono ?? null})
      RETURNING id
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 });
    }
    console.error("Error en POST /api/categorias:", error);
    return NextResponse.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}

