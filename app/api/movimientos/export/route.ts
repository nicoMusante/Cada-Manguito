import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function celdaCsv(valor: string | number | null): string {
  const texto = valor === null ? "" : String(valor);
  if (/[",\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

// GET /api/movimientos/export → todos los movimientos del usuario (todos los
// períodos, no sólo el mes en curso) como CSV, para bajar un backup propio.
export async function GET() {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const rows = await sql`
      SELECT fecha, tipo, categoria, descripcion, monto, moneda, monto_original
      FROM v_movimientos
      WHERE usuario_id = ${usuarioId}
      ORDER BY fecha DESC, id DESC
    `;

    const encabezado = ["fecha", "tipo", "categoria", "descripcion", "monto", "moneda", "monto_original"];
    const lineas = [encabezado.join(",")];
    for (const r of rows as Record<string, string | number | null>[]) {
      lineas.push(
        [r.fecha, r.tipo, r.categoria, r.descripcion, r.monto, r.moneda, r.monto_original]
          .map(celdaCsv)
          .join(",")
      );
    }
    const csv = "﻿" + lineas.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cada-manguito-movimientos.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error en GET /api/movimientos/export:", error);
    return NextResponse.json({ error: "No se pudo exportar los movimientos" }, { status: 500 });
  }
}
