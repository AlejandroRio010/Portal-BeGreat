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
    html: emailWrapper("Recuperación de acceso",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 28px;">
        Hemos recibido una solicitud para restablecer la contraseña de tu acceso al Portal de BeGreat.
        Pulsa el botón para crear una nueva contraseña. <strong>El enlace caduca en 1 hora.</strong>
      </p>`,
      resetUrl, "Restablecer contraseña →",
      `Si no has solicitado este cambio, ignora este correo: tu contraseña seguirá siendo la misma.`
    ),
  });
}

export async function sendAccessInviteEmail(to: string, nombre: string, accessUrl: string) {
  if (!resend) {
    console.error("RESEND_API_KEY no configurada — no se puede enviar el email");
    throw new Error("Email no configurado");
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu acceso al Portal BeGreat está listo",
    html: emailWrapper("Invitación al portal",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 28px;">
        Ya tienes acceso al <strong>Portal de Colaboradores de BeGreat Consulting</strong>.
        Pulsa el botón para crear tu contraseña y empezar a operar. <strong>El enlace caduca en 48 horas.</strong>
      </p>`,
      accessUrl, "Crear mi contraseña →",
      `Si no esperabas este correo, puedes ignorarlo.`
    ),
  });
}

// ─── Operation notification emails ──────────────────────────────────────────

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";

export async function sendOperationValidatedEmail(
  to: string, nombre: string, opNombre: string, opId: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  await resend.emails.send({
    from: FROM, to,
    subject: `Operación validada — ${opNombre}`,
    html: emailWrapper("Operación validada",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 28px;">
        Tu operación <strong>${opNombre}</strong> ha sido validada y ya está activa en el portal.
      </p>`,
      url, "Ver operación →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendOperationApprovedEmail(
  to: string, nombre: string, opNombre: string, opId: string,
  importe: string, feeColaborador: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  await resend.emails.send({
    from: FROM, to,
    subject: `¡Operación aprobada! — ${opNombre}`,
    html: emailWrapper("Operación aprobada",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 10px;">
        ¡Enhorabuena! La operación <strong>${opNombre}</strong> ha sido <strong style="color: #059669;">aprobada</strong>.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 0 0 28px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 4px 0; color: #888;">Importe de la operación</td><td style="text-align: right; font-weight: bold;">${importe}</td></tr>
          <tr><td style="padding: 4px 0; color: #888;">Tu comisión</td><td style="text-align: right; font-weight: bold; color: #059669;">${feeColaborador}</td></tr>
        </table>
      </div>`,
      url, "Ver operación →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendOperationWonEmail(
  to: string, nombre: string, opNombre: string, opId: string,
  importe: string, feeColaborador: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  await resend.emails.send({
    from: FROM, to,
    subject: `¡Operación ganada! — ${opNombre}`,
    html: emailWrapper("Operación ganada",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 10px;">
        ¡Enhorabuena! La operación <strong>${opNombre}</strong> ha sido <strong style="color: #059669;">ganada</strong>.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 0 0 16px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 4px 0; color: #888;">Importe de la operación</td><td style="text-align: right; font-weight: bold;">${importe}</td></tr>
          <tr><td style="padding: 4px 0; color: #888;">Tu comisión</td><td style="text-align: right; font-weight: bold; color: #059669;">${feeColaborador}</td></tr>
        </table>
      </div>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 28px;">
        La factura correspondiente será abonada en los próximos días.
      </p>`,
      url, "Ver operación →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendTaskReminderEmail(
  to: string, nombre: string, opNombre: string, opId: string,
  tareas: string[], senderName: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  const rows = tareas.map(t => `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #333;">• ${t}</td></tr>`).join("");
  await resend.emails.send({
    from: FROM, to,
    subject: `Tareas pendientes — ${opNombre}`,
    html: emailWrapper("Tareas pendientes",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 10px;">
        <strong>${senderName}</strong> te recuerda que tienes tareas pendientes en la operación <strong>${opNombre}</strong>:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 28px; background: #f8f7fb; border: 1px solid #E5E1EC;">
        ${rows}
      </table>`,
      url, "Ver operación →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendOperationDeniedEmail(
  to: string, nombre: string, opNombre: string, opId: string,
  motivo: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  await resend.emails.send({
    from: FROM, to,
    subject: `Operación denegada — ${opNombre}`,
    html: emailWrapper("Operación denegada",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 10px;">
        Lamentamos informarte de que la operación <strong>${opNombre}</strong> ha sido <strong style="color: #dc2626;">denegada</strong>.
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 0 0 28px;">
        <p style="font-size: 11px; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin: 0 0 6px;">Motivo</p>
        <p style="font-size: 14px; color: #7f1d1d; margin: 0;">${motivo || "No especificado"}</p>
      </div>`,
      url, "Ver operación →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendInfoRequestEmail(
  to: string, nombre: string, opNombre: string, opId: string,
  mensaje: string, authorName: string
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/portal/operaciones/${opId}`;
  await resend.emails.send({
    from: FROM, to,
    subject: `Información solicitada — ${opNombre}`,
    html: emailWrapper("Solicitud de información",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 10px;">
        <strong>${authorName}</strong> necesita información adicional sobre la operación <strong>${opNombre}</strong>.
      </p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 0 0 28px;">
        <p style="font-size: 14px; color: #1e3a5f; margin: 0; line-height: 1.6;">${mensaje}</p>
      </div>`,
      url, "Responder en el portal →",
      "Recibes este email porque eres colaborador de BeGreat Consulting."
    ),
  });
}

export async function sendPendingValidationDigest(
  to: string, nombre: string, ops: { nombre: string; colaborador: string; fecha: string }[]
) {
  if (!resend) { console.error("RESEND_API_KEY no configurada"); return; }
  const url = `${PORTAL_URL}/admin/operaciones`;
  const rows = ops.map(o =>
    `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${o.nombre}</td>
     <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #888;">${o.colaborador}</td>
     <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #888;">${o.fecha}</td></tr>`
  ).join("");
  await resend.emails.send({
    from: FROM, to,
    subject: `${ops.length} operación${ops.length !== 1 ? "es" : ""} pendiente${ops.length !== 1 ? "s" : ""} de validar`,
    html: emailWrapper("Operaciones pendientes",
      `<p style="font-size: 16px; color: #1a1a1a; margin: 0 0 14px; font-weight: 600;">Hola${nombre ? " " + nombre.split(" ")[0] : ""},</p>
      <p style="font-size: 14px; line-height: 1.65; color: #555; margin: 0 0 16px;">
        Tienes <strong>${ops.length}</strong> operación${ops.length !== 1 ? "es" : ""} pendiente${ops.length !== 1 ? "s" : ""} de validar:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 28px;">
        <tr style="background: #f8f7fb;">
          <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #2E1A47; letter-spacing: 1px;">Operación</th>
          <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #2E1A47; letter-spacing: 1px;">Colaborador</th>
          <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #2E1A47; letter-spacing: 1px;">Fecha</th>
        </tr>
        ${rows}
      </table>`,
      url, "Ir al portal →",
      "Recibes este resumen cada 2 días si hay operaciones pendientes."
    ),
  });
}

function emailWrapper(tagline: string, body: string, url: string, buttonText: string, footer: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #ECECEC;">
      <div style="background: #2E1A47; padding: 32px 28px; text-align: center;">
        <img src="https://portal.begreatconsulting.es/begreat-logo-blanco.png" alt="BeGreat Consulting" width="170" style="display: inline-block; max-width: 170px; height: auto;" />
      </div>
      <div style="padding: 36px 32px; background: #f8f7fb;">
        <p style="font-size: 11px; color: #2E1A47; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin: 0 0 16px;">${tagline}</p>
        ${body}
        <div style="text-align: center; margin: 0 0 28px;">
          <a href="${url}" style="display: inline-block; background: #2E1A47; color: #ffffff; padding: 14px 34px; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 0.3px;">
            ${buttonText}
          </a>
        </div>
        <div style="border-top: 1px solid #E5E1EC; padding-top: 18px;">
          <p style="font-size: 12px; color: #999; line-height: 1.5; margin: 0 0 10px;">${footer}</p>
          <p style="font-size: 11px; color: #bbb; margin: 0; word-break: break-all;">
            ¿El botón no funciona? Copia este enlace en tu navegador:<br>${url}
          </p>
        </div>
      </div>
      <div style="background: #2E1A47; padding: 18px; text-align: center;">
        <p style="color: rgba(255,255,255,0.55); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} BeGreat Consulting · Portal de colaboradores</p>
      </div>
    </div>`;
}
