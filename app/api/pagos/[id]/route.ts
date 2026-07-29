import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/pagos/:id → deshace una cuota puntual; si esa cuota había
// saldado la deuda, la reabre.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT eliminar_pago(${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/pagos/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar el pago" }, { status: 500 });
  }
}
