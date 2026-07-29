import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/deudas/:id/pagos → registra el pago de una cuota (parte o el
// total del saldo pendiente) de una entrada de deuda puntual.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    const body = await request.json();
    const monto = Number(body?.monto);
    if (!monto || monto <= 0) {
      return NextResponse.json({ error: "El monto tiene que ser mayor a 0." }, { status: 400 });
    }

    await sql`SELECT pagar_movimiento(${id}, ${monto})`;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/deudas/[id]/pagos:", error);
    const message = error instanceof Error ? error.message : "No se pudo registrar el pago";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}
