import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/movimientos → últimos movimientos, usando la vista v_movimientos
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, categoria_id, descripcion, categoria, tipo, color_hex, icono, monto, fecha
      FROM v_movimientos
      ORDER BY fecha DESC, id DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error en GET /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudieron obtener los movimientos" }, { status: 500 });
  }
}

// POST /api/movimientos → crea un movimiento nuevo usando la función insertar_movimiento
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoria_id, descripcion, monto, fecha } = body;

    if (!categoria_id || !descripcion || !monto) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: categoria_id, descripcion, monto" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT insertar_movimiento(${categoria_id}, ${descripcion}, ${monto}, ${fecha ?? null}) AS id
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudo crear el movimiento" }, { status: 500 });
  }
}
