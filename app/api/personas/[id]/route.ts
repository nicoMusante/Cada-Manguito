import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/personas/:id → datos de la persona + historial completo (pendientes y saldadas)
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    const personaRows = await sql`SELECT id, nombre FROM personas WHERE id = ${id}`;
    if (personaRows.length === 0) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    const historial = await sql`
      SELECT id, tipo, monto, descripcion, fecha, estado, saldado_en
      FROM deudas
      WHERE persona_id = ${id}
      ORDER BY fecha DESC, id DESC
    `;

    const neto = historial
      .filter((d: any) => d.estado === "pendiente")
      .reduce((acc: number, d: any) => acc + (d.tipo === "ME_DEBEN" ? Number(d.monto) : -Number(d.monto)), 0);

    return NextResponse.json({ persona: personaRows[0], neto, historial });
  } catch (error) {
    console.error("Error en GET /api/personas/[id]:", error);
    return NextResponse.json({ error: "No se pudo obtener el historial" }, { status: 500 });
  }
}
