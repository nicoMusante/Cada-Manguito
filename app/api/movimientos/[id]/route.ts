import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// PATCH /api/movimientos/:id → edita un movimiento existente
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: "Id inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { categoria_id, descripcion, monto, tipo, fecha, moneda, monto_original } = body;

    if (monto == null || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos: monto, tipo" }, { status: 400 });
    }
    if (tipo !== "GASTO" && tipo !== "INGRESO") {
      return NextResponse.json({ error: "tipo debe ser GASTO o INGRESO" }, { status: 400 });
    }
    if (!categoria_id && !descripcion?.trim()) {
      return NextResponse.json({ error: "El movimiento necesita categoría o descripción" }, { status: 400 });
    }

    await sql`
      SELECT actualizar_movimiento(
        ${usuarioId}, ${id}, ${categoria_id ?? null}, ${descripcion?.trim() || null}, ${monto}, ${tipo}, ${fecha ?? null},
        ${moneda ?? "ARS"}, ${monto_original ?? null}
      )
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
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

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
