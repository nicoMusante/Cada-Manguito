import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/deudas/:id → elimina una entrada de deuda puntual
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`DELETE FROM deudas WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/deudas/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar la deuda" }, { status: 500 });
  }
}
