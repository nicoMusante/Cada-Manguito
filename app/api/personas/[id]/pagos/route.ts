import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";
import { MONTO_MAXIMO } from "@/lib/formatMonto";

export const dynamic = "force-dynamic";

// POST /api/personas/:id/pagos reparte un pago entre las deudas pendientes
// más antiguas de la misma dirección y deja un único movimiento contable.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const personaId = Number(params.id);
    const { monto, tipo } = await request.json();
    if (!personaId || (tipo !== "ME_DEBEN" && tipo !== "YO_DEBO")) {
      return NextResponse.json({ error: "Datos de pago inválidos." }, { status: 400 });
    }
    if (!monto || monto <= 0 || monto > MONTO_MAXIMO) {
      return NextResponse.json({ error: "El monto de pago no es válido." }, { status: 400 });
    }

    await sql`SELECT pagar_persona(${usuarioId}, ${personaId}, ${tipo}, ${monto})`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/personas/[id]/pagos:", error);
    const message = error instanceof Error ? error.message : "No se pudo registrar el pago.";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}
