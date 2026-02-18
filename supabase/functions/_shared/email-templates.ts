/**
 * Templates email professionnels – Ferme Équestre An Arwen
 * Charte graphique : Vert Sauge (#6B8E7F), Taupe (#8B7D6B), Or Doux (#C9B896), Crème (#F5F3F0)
 * Typographie : Georgia (serif) pour titres, système sans-serif pour corps
 *
 * Adresses email dédiées :
 *  - devis@ferme-equestre-arwen.com      → Devis clients
 *  - factures@ferme-equestre-arwen.com    → Factures
 *  - newsletter@ferme-equestre-arwen.com  → Newsletter & notifications abonnés
 *  - notifications@ferme-equestre-arwen.com → Alertes admin & système
 *  - relance@ferme-equestre-arwen.com     → Rappels devis & profils incomplets
 *  - contact@ferme-equestre-arwen.com     → Contact général
 */

// ── Sender addresses ────────────────────────────────────────────────
export const EMAIL_SENDERS = {
  devis:         { name: "An Arwen – Devis",         email: "devis@ferme-equestre-arwen.com" },
  factures:      { name: "An Arwen – Facturation",   email: "factures@ferme-equestre-arwen.com" },
  newsletter:    { name: "An Arwen – Newsletter",    email: "newsletter@ferme-equestre-arwen.com" },
  notifications: { name: "An Arwen – Notifications", email: "notifications@ferme-equestre-arwen.com" },
  relance:       { name: "An Arwen – Rappels",       email: "relance@ferme-equestre-arwen.com" },
  contact:       { name: "Ferme Équestre An Arwen",   email: "contact@ferme-equestre-arwen.com" },
} as const;

// ── Company constants ───────────────────────────────────────────────
const COMPANY = {
  name: "Ferme Équestre An Arwen",
  shortName: "An Arwen",
  address: "5 Le Bignon, 35360 La Chapelle du Lou du Lac",
  phone: "06 59 22 62 70",
  email: "contact@ferme-equestre-arwen.com",
  siret: "80266354200016",
  tva: "Non assujetti à la TVA – art. 293 B du CGI",
  website: "https://www.ferme-equestre-an-arwen.com",
  logoUrl: "https://www.ferme-equestre-an-arwen.com/images/logo-cheval-email.png",
  social: {
    facebook: "https://www.facebook.com/fermeequestrearwen/",
    instagram: "https://www.instagram.com/fermeequestreanarwen/",
  },
};

export function getAppUrl(): string {
  return Deno.env.get("APP_URL") || "https://www.ferme-equestre-an-arwen.com";
}

// ── Shared formatters ───────────────────────────────────────────────
export function formatDate(dateString?: string | null): string {
  if (!dateString) return "À définir";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
}

// ── Master layout ───────────────────────────────────────────────────
/**
 * Wraps any body content in the branded email layout with logo, header, footer.
 * @param subtitle  Small text under the logo (e.g. "Votre devis personnalisé")
 * @param body      HTML body content
 * @param options   Optional overrides
 */
export function wrapInBrandedLayout(
  subtitle: string,
  body: string,
  options?: {
    preheader?: string;
    ctaUrl?: string;
    ctaLabel?: string;
    footerExtra?: string;
    unsubscribeUrl?: string;
  }
): string {
  const appUrl = getAppUrl();
  const cta = options?.ctaUrl
    ? `<table role="presentation" style="width:100%;margin:30px 0 10px 0;">
        <tr><td align="center">
          <a href="${options.ctaUrl}" style="display:inline-block;background-color:#6B8E7F;color:#ffffff;text-decoration:none;padding:16px 45px;border-radius:8px;font-size:16px;font-weight:600;font-family:Georgia,serif;">
            ${options.ctaLabel || "Accéder à mon Espace"}
          </a>
        </td></tr>
       </table>`
    : "";

  const unsubscribe = options?.unsubscribeUrl
    ? `<p style="margin:15px 0 0 0;"><a href="${options.unsubscribeUrl}" style="color:rgba(255,255,255,0.5);font-size:11px;text-decoration:underline;">Se désinscrire</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${options?.preheader ? `<meta name="x-preheader" content="${options.preheader}">` : ""}
  <title>${subtitle} – ${COMPANY.name}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#F5F3F0;-webkit-font-smoothing:antialiased;">
  ${options?.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${options.preheader}</div>` : ""}
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ═══ HEADER with Logo ═══ -->
          <tr>
            <td style="background:linear-gradient(135deg,#6B8E7F 0%,#5A7A6D 50%,#8B7D6B 100%);padding:35px 30px 25px 30px;text-align:center;">
              <img src="${COMPANY.logoUrl}" alt="${COMPANY.name}" width="80" height="80" style="display:block;margin:0 auto 15px auto;border-radius:50%;border:3px solid rgba(255,255,255,0.3);" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.5px;">${COMPANY.name}</h1>
              <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.85);font-size:15px;font-style:italic;">${subtitle}</p>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding:35px 30px;">
              ${body}
              ${cta}
            </td>
          </tr>

          ${options?.footerExtra ? `
          <!-- ═══ LEGAL / EXTRA ═══ -->
          <tr>
            <td style="padding:20px 30px;background-color:#FAFAF8;border-top:1px solid #EDEBE8;">
              ${options.footerExtra}
            </td>
          </tr>
          ` : ""}

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background-color:#2D2D2D;padding:30px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#ffffff;font-size:15px;font-weight:600;font-family:Georgia,serif;">${COMPANY.name}</p>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.6);font-size:12px;">${COMPANY.address}</p>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.6);font-size:12px;">📞 ${COMPANY.phone}</p>
              <p style="margin:0 0 12px 0;color:rgba(255,255,255,0.6);font-size:12px;">✉️ ${COMPANY.email}</p>
              <!-- Social icons -->
              <p style="margin:0;">
                <a href="${COMPANY.social.facebook}" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:12px;margin:0 8px;">Facebook</a>
                <span style="color:rgba(255,255,255,0.3);">•</span>
                <a href="${COMPANY.social.instagram}" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:12px;margin:0 8px;">Instagram</a>
                <span style="color:rgba(255,255,255,0.3);">•</span>
                <a href="${appUrl}" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:12px;margin:0 8px;">Site web</a>
              </p>
              ${unsubscribe}
            </td>
          </tr>

        </table>
        <!-- ═══ ANTI-SPAM FOOTER ═══ -->
        <p style="margin:20px 0 0 0;color:#999;font-size:11px;text-align:center;">
          Cet email a été envoyé par ${COMPANY.name} – SIRET ${COMPANY.siret}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Reusable content blocks ─────────────────────────────────────────

/** Greeting paragraph */
export function greeting(name: string): string {
  return `<p style="margin:0 0 20px 0;color:#333;font-size:16px;line-height:1.6;">Bonjour <strong>${name}</strong>,</p>`;
}

/** Paragraph */
export function paragraph(text: string): string {
  return `<p style="margin:0 0 20px 0;color:#555;font-size:15px;line-height:1.7;">${text}</p>`;
}

/** Info card (beige background with left border) */
export function infoCard(content: string, color?: string): string {
  const borderColor = color || "#C9B896";
  return `<table role="presentation" style="width:100%;background-color:#FFF8E1;border-radius:12px;margin:20px 0;border-left:4px solid ${borderColor};">
    <tr><td style="padding:20px;">${content}</td></tr>
  </table>`;
}

/** Activity detail card */
export function activityCard(opts: {
  title: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  participants?: number;
}): string {
  return `<table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;margin:20px 0;">
    <tr><td style="padding:25px;">
      <h2 style="margin:0 0 12px 0;color:#333;font-size:20px;font-weight:600;font-family:Georgia,serif;">${opts.title}</h2>
      ${opts.duration ? `<p style="margin:0 0 8px 0;color:#666;font-size:14px;">📅 Durée : ${opts.duration}</p>` : ""}
      ${opts.startDate ? `<p style="margin:0 0 8px 0;color:#666;font-size:14px;">📆 Du ${formatDate(opts.startDate)} au ${formatDate(opts.endDate)}</p>` : ""}
      ${opts.participants ? `<p style="margin:0;color:#666;font-size:14px;">👥 ${opts.participants} participant${opts.participants > 1 ? "s" : ""}</p>` : ""}
    </td></tr>
  </table>`;
}

/** Pricing table row */
export function priceRow(label: string, value: string, bold = false): string {
  const style = bold
    ? "padding:15px 0;color:#333;font-size:18px;font-weight:600;"
    : "padding:10px 0;border-bottom:1px solid #EDEBE8;color:#666;font-size:14px;";
  const valueStyle = bold
    ? "padding:15px 0;color:#6B8E7F;font-size:22px;font-weight:700;text-align:right;font-family:Georgia,serif;"
    : "padding:10px 0;border-bottom:1px solid #EDEBE8;color:#333;font-size:14px;text-align:right;";
  return `<tr><td style="${style}">${label}</td><td style="${valueStyle}">${value}</td></tr>`;
}

/** Full pricing table */
export function pricingTable(rows: string): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;">${rows}</table>`;
}

/** Badge / pill */
export function badge(text: string, bgColor = "#6B8E7F"): string {
  return `<span style="display:inline-block;background-color:${bgColor};color:#ffffff;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:600;">${text}</span>`;
}

/** Separator */
export function separator(): string {
  return `<hr style="border:none;border-top:1px solid #EDEBE8;margin:25px 0;">`;
}
