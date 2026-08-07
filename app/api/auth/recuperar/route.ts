import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { demasiadosIntentos, registrarIntentoFallido } from "@/lib/rateLimit";
import { enviarMailRecuperacion } from "@/lib/mail";

export const dynamic = "force-dynamic";

// POST /api/auth/recuperar → pide un mail, genera un token si la cuenta
// existe y usa contraseña propia, y manda el link de reseteo. La respuesta
// es siempre la misma exista o no la cuenta, para no filtrar esa info.
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 });
    }
    const identificador = email.trim().toLowerCase();

    if (await demasiadosIntentos(`recuperar:${identificador}`)) {
      return NextResponse.json(
        { error: "Demasiados pedidos. Esperá unos minutos y volvé a intentar." },
        { status: 429 }
      );
    }
    await registrarIntentoFallido(`recuperar:${identificador}`);

    const rows = await sql`SELECT id, password_hash FROM usuarios WHERE email = ${identificador}`;
    const usuario = rows[0] as { id: number; password_hash: string | null } | undefined;

    if (usuario?.password_hash) {
      const token = crypto.randomBytes(32).toString("hex");
      await sql`
        INSERT INTO tokens_reset_password (usuario_id, token, expira_en)
        VALUES (${usuario.id}, ${token}, CURRENT_TIMESTAMP + INTERVAL '1 hour')
      `;
      const origen = request.headers.get("origin") || new URL(request.url).origin;
      await enviarMailRecuperacion(identificador, `${origen}/resetear-password?token=${token}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en POST /api/auth/recuperar:", error);
    return NextResponse.json({ error: "No se pudo procesar el pedido" }, { status: 500 });
  }
}
