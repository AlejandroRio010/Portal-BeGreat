import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Remitente: cuando el dominio esté verificado en Resend usa no-reply@begreatconsulting.es.
// Mientras tanto, Resend permite enviar desde onboarding@resend.dev (solo a tu propio email).
const FROM = process.env.EMAIL_FROM || "BeGreat Consulting <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, nombre: string, resetUrl: string) {
  if (!resend) {
    console.error("RESEND_API_KEY no configurada — no se puede enviar el email");
    throw new Error("Email no configurado");
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — Portal BeGreat",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #2E1A47; padding: 28px; text-align: center;">
          <span style="color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 1px;">BEGREAT CONSULTING</span>
        </div>
        <div style="padding: 32px 28px; background: #f8f7fb;">
          <p style="font-size: 15px;">Hola${nombre ? " " + nombre : ""},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">
            Hemos recibido una solicitud para restablecer la contraseña de tu acceso al portal.
            Pulsa el botón para crear una nueva contraseña. Este enlace caduca en 1 hora.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #2E1A47; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Restablecer contraseña
            </a>
          </div>
          <p style="font-size: 12px; color: #888; line-height: 1.5;">
            Si no has solicitado este cambio, puedes ignorar este correo y tu contraseña seguirá siendo la misma.
          </p>
          <p style="font-size: 11px; color: #aaa; margin-top: 20px; word-break: break-all;">
            Si el botón no funciona, copia este enlace: ${resetUrl}
          </p>
        </div>
        <div style="background: #2E1A47; padding: 16px; text-align: center;">
          <span style="color: rgba(255,255,255,0.5); font-size: 11px;">© ${new Date().getFullYear()} BeGreat Consulting</span>
        </div>
      </div>
    `,
  });
}
