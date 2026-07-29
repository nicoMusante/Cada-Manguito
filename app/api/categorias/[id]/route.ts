import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/categorias/:id → baja lógica (activo = false), no borra la fila
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT eliminar_categoria(${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/categorias/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 500 });
  }
}
