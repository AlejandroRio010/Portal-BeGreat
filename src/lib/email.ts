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
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #ECECEC;">
        <!-- Cabecera con logo -->
        <div style="background: #2E1A47; padding: 32px 28px; text-align: center;">
          <img src="https://portal.begreatconsulting.es/begreat-logo-blanco.png" alt="BeGreat Consulting" width="170" style="display: inline-block; max-width: 170px; height: auto;" />
        </div>
        <!-- Cuerpo -->
        <div style="padding: 36px 32px; background: #f8f7fb;">
          <p style="font-size: 11px; color: #2E1A47; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin: 0 0 16px;">Recuperación de acceso</p>
          <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
          <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 28px;">
            Hemos recibido una solicitud para restablecer la contraseña de tu acceso al Portal de BeGreat.
            Pulsa el botón para crear una nueva contraseña. <strong>El enlace caduca en 1 hora.</strong>
          </p>
          <div style="text-align: center; margin: 0 0 28px;">
            <a href="${resetUrl}" style="display: inline-block; background: #2E1A47; color: #ffffff; padding: 14px 34px; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 0.3px;">
              Restablecer contraseña →
            </a>
          </div>
          <div style="border-top: 1px solid #E5E1EC; padding-top: 18px;">
            <p style="font-size: 12px; color: #999; line-height: 1.5; margin: 0 0 10px;">
              Si no has solicitado este cambio, ignora este correo: tu contraseña seguirá siendo la misma.
            </p>
            <p style="font-size: 11px; color: #bbb; margin: 0; word-break: break-all;">
              ¿El botón no funciona? Copia este enlace en tu navegador:<br>${resetUrl}
            </p>
          </div>
        </div>
        <!-- Footer -->
        <div style="background: #2E1A47; padding: 18px; text-align: center;">
          <p style="color: rgba(255,255,255,0.55); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} BeGreat Consulting · Portal de colaboradores</p>
        </div>
      </div>
    `,
  });
}
