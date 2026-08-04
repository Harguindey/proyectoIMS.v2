/**
 * emailService.ts
 * Transactional email via Resend.
 * Lazy-initialised: server starts fine without RESEND_API_KEY;
 * only errors when an email is actually sent.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "LogiPro <noreply@logipro.app>";
  const appUrl = process.env.APP_URL || "http://localhost:5000";
  return { apiKey, fromEmail, appUrl };
}

// ── Core sender (uses Resend REST API directly — no SDK needed) ───────────────

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const { apiKey, fromEmail } = getConfig();

  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not set — email not sent:", subject, "→", to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });

    const data = await res.json() as { id?: string; message?: string };

    if (!res.ok) {
      console.error("[Email] Resend error:", data);
      return { success: false, error: data.message ?? "Unknown error" };
    }

    console.log(`[Email] Sent "${subject}" → ${to} (id: ${data.id})`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error("[Email] Network error:", err?.message);
    return { success: false, error: err?.message };
  }
}

// ── Base layout ───────────────────────────────────────────────────────────────

function layout(content: string, previewText = "") {
  const { appUrl } = getConfig();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LogiPro</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;color:#f4f6f9;">${previewText}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 14px;">
                  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.5px;">⚡ LogiPro</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
              LogiPro ERP · WMS · SaaS · Hecho en España
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">${appUrl}</a>
              &nbsp;·&nbsp;
              <a href="${appUrl}/settings" style="color:#94a3b8;text-decoration:none;">Gestionar notificaciones</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Button helper ─────────────────────────────────────────────────────────────

function btn(url: string, text: string, color = "#2563eb") {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td style="background:${color};border-radius:8px;text-align:center;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:.2px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">${text}</h1>`;
}

function p(text: string, style = "") {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;${style}">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />`;
}

function infoBox(content: string) {
  return `<div style="background:#f0f9ff;border-left:4px solid #3b82f6;border-radius:6px;padding:16px 20px;margin:20px 0;">
    ${content}
  </div>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

/**
 * 1. Password reset
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string
): Promise<SendResult> {
  const name = userName ?? "usuario";
  const html = layout(
    `
    ${h1("Restablecer tu contraseña")}
    ${p(`Hola ${name},`)}
    ${p("Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en LogiPro. Haz clic en el botón para continuar:")}
    ${btn(resetUrl, "Restablecer contraseña")}
    ${divider()}
    ${p("Este enlace caduca en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este email con total seguridad.", "font-size:13px;color:#64748b;")}
    `,
    "Restablecer contraseña de LogiPro"
  );
  return sendEmail(to, "Restablecer contraseña — LogiPro", html);
}

/**
 * 2. Email verification (sent immediately after /signup)
 */
export async function sendEmailVerificationEmail(
  to: string,
  verifyUrl: string,
  userName?: string
): Promise<SendResult> {
  const name = userName ?? "usuario";
  const html = layout(
    `
    ${h1("Confirma tu dirección de email")}
    ${p(`Hola ${name},`)}
    ${p("Gracias por registrarte en LogiPro. Para activar tu cuenta y empezar a usar todos los módulos, confirma tu dirección de email haciendo clic en el botón:")}
    ${btn(verifyUrl, "Verificar mi email ✓", "#059669")}
    ${divider()}
    ${p("Este enlace caduca en <strong>24 horas</strong>. Si no creaste esta cuenta, puedes ignorar este email.", "font-size:13px;color:#64748b;")}
    `,
    "Confirma tu email para activar LogiPro"
  );
  return sendEmail(to, "Confirma tu email — LogiPro", html);
}

/**
 * 3. Welcome / account confirmation (sent after email is verified)
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  orgName: string,
  loginUrl: string
): Promise<SendResult> {
  const { appUrl } = getConfig();
  const html = layout(
    `
    ${h1(`¡Bienvenido a LogiPro, ${userName}!`)}
    ${p(`Tu cuenta y la empresa <strong>${orgName}</strong> están listas. Tienes <strong>14 días de prueba gratuita</strong> con acceso completo a todos los módulos.`)}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e40af;">¿Qué puedes hacer ahora?</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#1e3a8a;line-height:1.8;">
        <li>Importar tus productos desde Excel</li>
        <li>Configurar tu almacén con zonas y ubicaciones</li>
        <li>Invitar a tu equipo con roles personalizados</li>
        <li>Explorar el TPV, SGA y módulos ERP</li>
      </ul>
    `)}
    ${btn(loginUrl, "Ir a mi empresa →")}
    ${divider()}
    ${p("Si tienes cualquier pregunta, responde directamente a este email.", "font-size:13px;color:#64748b;")}
    `,
    "Tu cuenta de LogiPro está lista"
  );
  return sendEmail(to, `¡Bienvenido a LogiPro, ${userName}!`, html);
}

/**
 * 3. User invitation
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  orgName: string,
  role: string,
  acceptUrl: string
): Promise<SendResult> {
  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    operator: "Operador",
    viewer: "Lector",
  };
  const html = layout(
    `
    ${h1(`Te han invitado a ${orgName}`)}
    ${p(`<strong>${inviterName}</strong> te ha invitado a unirte a <strong>${orgName}</strong> en LogiPro como <strong>${roleLabel[role] ?? role}</strong>.`)}
    ${p("LogiPro es una plataforma ERP · WMS · SaaS para gestionar inventario, almacén, ventas, logística y facturación en tiempo real.")}
    ${btn(acceptUrl, "Aceptar invitación", "#7c3aed")}
    ${divider()}
    ${p("Esta invitación caduca en <strong>7 días</strong>. Si no esperabas este email, puedes ignorarlo.", "font-size:13px;color:#64748b;")}
    `,
    `Invitación a unirte a ${orgName} en LogiPro`
  );
  return sendEmail(to, `Invitación a ${orgName} — LogiPro`, html);
}

/**
 * 4. Low stock alert
 */
export async function sendLowStockAlertEmail(
  to: string,
  orgName: string,
  products: { name: string; sku: string; currentStock: number; minStock: number }[]
): Promise<SendResult> {
  const rows = products.map(p2 =>
    `<tr>
      <td style="padding:10px 12px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${p2.name}</td>
      <td style="padding:10px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">${p2.sku}</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#dc2626;text-align:center;border-bottom:1px solid #f1f5f9;">${p2.currentStock}</td>
      <td style="padding:10px 12px;font-size:13px;color:#64748b;text-align:center;border-bottom:1px solid #f1f5f9;">${p2.minStock}</td>
    </tr>`
  ).join("");

  const { appUrl } = getConfig();
  const html = layout(
    `
    ${h1("⚠️ Alerta de stock mínimo")}
    ${p(`Los siguientes productos de <strong>${orgName}</strong> han alcanzado o superado el umbral mínimo de stock:`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e2e8f0;">Producto</th>
          <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e2e8f0;">SKU</th>
          <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e2e8f0;">Stock actual</th>
          <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e2e8f0;">Mínimo</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${btn(`${appUrl}/procurement`, "Ver reabastecimiento", "#f59e0b")}
    `,
    `${products.length} producto(s) con stock bajo en ${orgName}`
  );
  return sendEmail(to, `⚠️ Alerta de stock mínimo — ${products.length} producto(s)`, html);
}

/**
 * 5. Invoice to customer
 */
export async function sendInvoiceEmail(
  to: string,
  customerName: string,
  invoiceNumber: string,
  totalAmount: string,
  invoiceUrl: string,
  dueDate?: string
): Promise<SendResult> {
  const html = layout(
    `
    ${h1(`Factura ${invoiceNumber}`)}
    ${p(`Hola ${customerName},`)}
    ${p("Adjuntamos su factura correspondiente. Puede descargarla o consultarla en línea usando el siguiente enlace:")}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;color:#0f172a;">Número de factura</td>
          <td style="font-size:13px;color:#0f172a;text-align:right;font-weight:700;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#0f172a;padding-top:6px;">Importe total (IVA inc.)</td>
          <td style="font-size:20px;color:#1d4ed8;text-align:right;font-weight:800;padding-top:6px;">${totalAmount}</td>
        </tr>
        ${dueDate ? `<tr><td style="font-size:13px;color:#64748b;padding-top:6px;">Fecha de vencimiento</td><td style="font-size:13px;color:#64748b;text-align:right;padding-top:6px;">${dueDate}</td></tr>` : ""}
      </table>
    `)}
    ${btn(invoiceUrl, "Ver factura online")}
    ${divider()}
    ${p("Para cualquier consulta, puede responder directamente a este email.", "font-size:13px;color:#64748b;")}
    `,
    `Factura ${invoiceNumber} de LogiPro`
  );
  return sendEmail(to, `Factura ${invoiceNumber}`, html);
}

/**
 * 6. Trial expiry / payment reminder
 */
export async function sendTrialExpiryEmail(
  to: string,
  userName: string,
  orgName: string,
  daysLeft: number,
  upgradeUrl: string
): Promise<SendResult> {
  const isExpired = daysLeft <= 0;
  const subject = isExpired
    ? `Tu prueba gratuita de LogiPro ha finalizado`
    : `Tu prueba gratuita caduca en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`;

  const html = layout(
    `
    ${h1(isExpired ? "Tu prueba gratuita ha finalizado" : `⏰ ${daysLeft} día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""} de prueba`)}
    ${p(`Hola ${userName},`)}
    ${isExpired
      ? p(`El periodo de prueba gratuita de <strong>${orgName}</strong> en LogiPro ha concluido. Para seguir accediendo a todos los módulos, activa tu suscripción.`)
      : p(`El periodo de prueba gratuita de <strong>${orgName}</strong> caduca en <strong>${daysLeft} día${daysLeft !== 1 ? "s" : ""}</strong>. Para mantener el acceso y conservar todos tus datos, activa tu plan.`)
    }
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e40af;">¿Qué incluye cada plan?</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#1e3a8a;">
        <tr><td style="padding:3px 0;">✅ Starter — 29€/mes — 3 usuarios, 1 almacén</td></tr>
        <tr><td style="padding:3px 0;">✅ Pro — 79€/mes — 10 usuarios, SGA + ERP completo</td></tr>
        <tr><td style="padding:3px 0;">✅ Enterprise — 199€/mes — Ilimitado, SSO, SLA</td></tr>
      </table>
    `)}
    ${btn(upgradeUrl, "Activar mi suscripción →", isExpired ? "#dc2626" : "#2563eb")}
    ${divider()}
    ${p("Tus datos están seguros y no se eliminarán.", "font-size:13px;color:#64748b;")}
    `,
    subject
  );
  return sendEmail(to, subject, html);
}
