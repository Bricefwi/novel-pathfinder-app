/**
 * Réplique côté client du template email brandé Ferme Équestre An Arwen.
 * Utilisé pour l'aperçu HTML avant envoi (cf. AliceApologyEmailButton).
 * Source de vérité : supabase/functions/_shared/email-templates.ts
 */

const COMPANY = {
  name: "Ferme Équestre An Arwen",
  address: "5 Le Bignon, 35360 La Chapelle du Lou du Lac",
  phone: "06 59 22 62 70",
  email: "contact@ferme-equestre-arwen.com",
  siret: "80266354200016",
  websiteDisplay: "www.ferme-equestre-arwen.com",
  logoUrl:
    "https://fgdskfvmcjdruiguzebd.supabase.co/storage/v1/object/public/activity-images/email/logo-cheval-email.png",
  facebookDisplay: "facebook.com/fermeequestrearwen",
  instagramDisplay: "instagram.com/fermeequestreanarwen",
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

interface BuildPreviewOptions {
  recipientName: string;
  subject: string;
  message: string;
  senderName?: string;
}

export function buildBrandedEmailPreview({
  recipientName,
  subject,
  message,
  senderName,
}: BuildPreviewOptions): string {
  const subtitle = subject || "Réponse à votre message";
  const safeName = escapeHtml(recipientName?.trim() || "Madame, Monsieur");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const safeSender = senderName ? escapeHtml(senderName) : "";

  const greetingHtml = `<p style="margin:0 0 20px 0;color:#333;font-size:16px;line-height:1.6;">Bonjour <strong>${safeName}</strong>,</p>`;
  const messageHtml = `<p style="margin:0 0 20px 0;color:#444;font-size:15px;line-height:1.7;">${safeMessage}</p>`;
  const signatureHtml = safeSender
    ? `<p style="margin:25px 0 0 0;color:#444;font-size:15px;line-height:1.7;">${safeSender}<br/><span style="color:#6B8E7F;font-style:italic;">${COMPANY.name}</span></p>`
    : `<p style="margin:25px 0 0 0;color:#6B8E7F;font-size:15px;font-style:italic;">${COMPANY.name}</p>`;

  const body = `${greetingHtml}${messageHtml}${signatureHtml}`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subtitle)} – ${COMPANY.name}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#F5F3F0;-webkit-font-smoothing:antialiased;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6B8E7F 0%,#5A7A6D 50%,#8B7D6B 100%);padding:40px 30px 30px 30px;text-align:center;">
              <table role="presentation" style="width:100%;"><tr><td align="center">
                <table role="presentation" style="margin:0 auto 18px auto;"><tr>
                  <td style="background-color:rgba(255,255,255,0.95);border-radius:50%;padding:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);">
                    <img src="${COMPANY.logoUrl}" alt="${COMPANY.name}" width="90" style="display:block;border-radius:50%;width:90px;height:auto;" />
                  </td>
                </tr></table>
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:600;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.2);">${COMPANY.name}</h1>
                <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;font-style:italic;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(subtitle)}</p>
                <table role="presentation" style="width:80px;margin:15px auto 0 auto;"><tr><td style="border-top:2px solid #C9B896;"></td></tr></table>
              </td></tr></table>
            </td>
          </tr>
          <tr><td style="padding:35px 30px;">${body}</td></tr>
          <tr>
            <td style="background-color:#2D2D2D;padding:30px;text-align:center;">
              <img src="${COMPANY.logoUrl}" alt="" width="40" height="40" style="display:block;margin:0 auto 12px auto;border-radius:50%;opacity:0.8;" />
              <p style="margin:0 0 8px 0;color:#ffffff;font-size:16px;font-weight:600;font-family:Georgia,serif;">${COMPANY.name}</p>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.6);font-size:12px;">${COMPANY.address}</p>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.6);font-size:12px;">📞 ${COMPANY.phone}</p>
              <p style="margin:0 0 15px 0;color:rgba(255,255,255,0.6);font-size:12px;">✉️ ${COMPANY.email}</p>
              <table role="presentation" style="width:120px;margin:0 auto 15px auto;"><tr><td style="border-top:1px solid rgba(255,255,255,0.15);"></td></tr></table>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.5);font-size:11px;">🌐 ${COMPANY.websiteDisplay}</p>
              <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.5);font-size:11px;">📘 ${COMPANY.facebookDisplay}</p>
              <p style="margin:0 0 0 0;color:rgba(255,255,255,0.5);font-size:11px;">📷 ${COMPANY.instagramDisplay}</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;color:#999;font-size:11px;text-align:center;">Cet email a été envoyé par ${COMPANY.name} – SIRET ${COMPANY.siret}</p>
      </td>
    </tr>
  </table>
</body></html>`;
}
