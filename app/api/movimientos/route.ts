import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/movimientos?periodo=YYYY-MM → movimientos del mes indicado (o el
// mes en curso si no se pasa), usando la vista v_movimientos.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodoActual = new Date().toISOString().slice(0, 7);
    const periodo = searchParams.get("periodo") || periodoActual;

    // si se está pidiendo el mes en curso, primero genero los movimientos de
    // los gastos fijos que ya cumplieron su día y todavía no se generaron
    if (periodo === periodoActual) {
      await sql`SELECT generar_gastos_fijos_pendientes()`;
    }

    const rows = await sql`
      SELECT id, categoria_id, descripcion, categoria, tipo, color_hex, icono, monto, fecha
      FROM v_movimientos
      WHERE periodo = ${periodo}
      ORDER BY fecha DESC, id DESC
    `;
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error en GET /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudieron obtener los movimientos" }, { status: 500 });
  }
}

// POST /api/movimientos → crea un movimiento nuevo, y opcionalmente una deuda
// vinculada si el gasto fue compartido con alguien.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoria_id, descripcion, monto, fecha, compartir } = body;

    if (!categoria_id || !descripcion || !monto) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: categoria_id, descripcion, monto" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT insertar_movimiento(${categoria_id}, ${descripcion}, ${monto}, ${fecha ?? null}) AS id
    `;
    const movimientoId = rows[0].id;

    // Si se compartió el gasto, la parte de la otra persona queda como
    // un pendiente a favor ("me deben"), vinculado a este movimiento.
    if (compartir?.persona_nombre?.trim() && compartir?.monto) {
      await sql`
        SELECT crear_deuda(
          ${compartir.persona_nombre.trim()}, 'ME_DEBEN', ${compartir.monto},
          ${descripcion}, ${fecha ?? null}, ${movimientoId}
        )
      `;
    }

    return NextResponse.json({ id: movimientoId }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudo crear el movimiento" }, { status: 500 });
  }
}
