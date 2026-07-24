import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/personas → personas con deuda pendiente (con neto y último detalle),
// más una lista corta de las deudas saldadas más recientes.
export async function GET() {
  try {
    const activas = await sql`
      SELECT persona_id, nombre, neto, ultimo_detalle
      FROM v_personas_activas
      ORDER BY ABS(neto) DESC
    `;

    const saldadas = await sql`
      SELECT d.id, p.nombre, d.monto, d.saldado_en
      FROM deudas d
      JOIN personas p ON p.id = d.persona_id
      WHERE d.estado = 'saldado'
      ORDER BY d.saldado_en DESC
      LIMIT 10
    `;

    return NextResponse.json(
      { activas, saldadas },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error en GET /api/personas:", error);
    return NextResponse.json({ error: "No se pudieron obtener las personas" }, { status: 500 });
  }
}
