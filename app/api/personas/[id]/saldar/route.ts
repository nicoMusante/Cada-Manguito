import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/personas/:id/saldar → salda todas las deudas pendientes con esa persona
export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT saldar_persona(${usuarioId}, ${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/personas/[id]/saldar:", error);
    return NextResponse.json({ error: "No se pudo saldar la deuda" }, { status: 500 });
  }
}
