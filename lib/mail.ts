import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// remitente de test de Resend, válido sin verificar dominio propio — para
// producción conviene verificar un dominio propio en Resend y cambiar esto
// vía la env var RESEND_FROM
const FROM = process.env.RESEND_FROM || "Cada Manguito <onboarding@resend.dev>";

export async function enviarMailRecuperacion(destino: string, urlReset: string) {
  if (!resend) {
    console.error("Falta RESEND_API_KEY: no se pudo enviar el mail de recuperación de contraseña.");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: destino,
    subject: "Recuperá tu contraseña — Cada Manguito",
    html: `
      <p>Pediste restablecer tu contraseña en Cada Manguito.</p>
      <p><a href="${urlReset}">Hacé click acá para elegir una nueva contraseña</a></p>
      <p>Si no fuiste vos, podés ignorar este mail.</p>
      <p>El link vence en 1 hora.</p>
    `,
  });
}
