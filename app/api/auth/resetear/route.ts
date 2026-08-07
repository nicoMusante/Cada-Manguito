import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/auth/resetear → valida el token del mail de recuperación y
// pisa el password_hash con la contraseña nueva.
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña tiene que tener al menos 8 caracteres." }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, usuario_id FROM tokens_reset_password
      WHERE token = ${token} AND usado = false AND expira_en > CURRENT_TIMESTAMP
    `;
    const registro = rows[0] as { id: number; usuario_id: number } | undefined;
    if (!registro) {
      return NextResponse.json({ error: "El link venció o ya se usó. Pedí uno nuevo." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await sql`UPDATE usuarios SET password_hash = ${passwordHash} WHERE id = ${registro.usuario_id}`;
    await sql`UPDATE tokens_reset_password SET usado = true WHERE id = ${registro.id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en POST /api/auth/resetear:", error);
    return NextResponse.json({ error: "No se pudo restablecer la contraseña" }, { status: 500 });
  }
}
