import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/personas/:id → datos de la persona + historial completo (pendientes y saldadas)
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    const personaRows = await sql`SELECT id, nombre FROM personas WHERE id = ${id} AND usuario_id = ${usuarioId}`;
    if (personaRows.length === 0) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    const historial = await sql`
      SELECT
        d.id, d.tipo, d.monto, d.descripcion, d.fecha, d.estado, d.saldado_en,
        COALESCE(pg.pagado, 0) AS pagado,
        COALESCE(pg.pagos, '[]'::json) AS pagos
      FROM deudas d
      LEFT JOIN LATERAL (
        SELECT
          SUM(monto) AS pagado,
          json_agg(json_build_object('id', id, 'monto', monto, 'fecha', fecha) ORDER BY fecha, id) AS pagos
        FROM pagos_deuda WHERE deuda_id = d.id
      ) pg ON true
      WHERE d.persona_id = ${id} AND d.usuario_id = ${usuarioId}
      ORDER BY d.fecha DESC, d.id DESC
    `;

    const neto = historial
      .filter((d: any) => d.estado === "pendiente")
      .reduce((acc: number, d: any) => {
        const saldo = Number(d.monto) - Number(d.pagado);
        return acc + (d.tipo === "ME_DEBEN" ? saldo : -saldo);
      }, 0);

    return NextResponse.json(
      { persona: personaRows[0], neto, historial },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error en GET /api/personas/[id]:", error);
    return NextResponse.json({ error: "No se pudo obtener el historial" }, { status: 500 });
  }
}
