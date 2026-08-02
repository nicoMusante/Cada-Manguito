import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE /api/gastos-fijos/:id → baja lógica; deja de generar movimientos nuevos
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT eliminar_gasto_fijo(${usuarioId}, ${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/gastos-fijos/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar el gasto fijo" }, { status: 500 });
  }
}
