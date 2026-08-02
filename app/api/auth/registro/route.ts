import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/auth/registro → alta de cuenta nueva con mail y contraseña
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, password } = body;

    if (!nombre?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: nombre, email, password" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña tiene que tener al menos 6 caracteres." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rows = await sql`
      INSERT INTO usuarios (email, nombre, password_hash)
      VALUES (${email.trim().toLowerCase()}, ${nombre.trim()}, ${passwordHash})
      RETURNING id
    `;
    const usuarioId = rows[0].id;

    await sql`SELECT sembrar_categorias_default(${usuarioId})`;

    return NextResponse.json({ id: usuarioId }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }
    console.error("Error en POST /api/auth/registro:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
