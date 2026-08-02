import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/movimientos/:id → edita un movimiento existente
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: "Id inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { categoria_id, descripcion, monto, fecha } = body;

    if (!categoria_id || !descripcion || !monto) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: categoria_id, descripcion, monto" },
        { status: 400 }
      );
    }

    await sql`
      SELECT actualizar_movimiento(${usuarioId}, ${id}, ${categoria_id}, ${descripcion}, ${monto}, ${fecha ?? null})
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/movimientos/[id]:", error);
    return NextResponse.json({ error: "No se pudo actualizar el movimiento" }, { status: 500 });
  }
}

// DELETE /api/movimientos/:id → elimina un movimiento
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: "Id inválido" }, { status: 400 });
    }

    await sql`SELECT eliminar_movimiento(${usuarioId}, ${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/movimientos/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar el movimiento" }, { status: 500 });
  }
}
