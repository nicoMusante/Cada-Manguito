import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// `sql` es una función "tagged template": se usa como sql`SELECT * FROM tabla WHERE id = ${id}`
// Internamente arma la query parametrizada (protege contra SQL injection automáticamente).
export const sql = neon(process.env.DATABASE_URL);
