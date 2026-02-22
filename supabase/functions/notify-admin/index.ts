import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, separator, badge,
} from "../_shared/email-templates.ts";

interface NotifyAdminRequest {
  type: "devis" | "disponibilite" | "contact" | "reservation" | "alert" | "report" | "reminder";
  data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message?: string;
    date?: string;
    activityTitle?: string;
    accommodationName?: string;
    participants?: number;
    totalPrice?: number;
    depositAmount?: number;
    paymentOption?: string;
  };
}

const PUBLIC_TYPES = ["disponibilite", "contact", "reservation", "devis"];

// Admin emails to notify (comma-separated env var or fallbacks)
function getAdminEmails(): string[] {
  const envEmails = Deno.env.get("ADMIN_NOTIFICATION_EMAILS");
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim()).filter(Boolean);
  }
  const single = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  if (single) return [single.trim()];
  return ["contact@ferme-equestre-arwen.com"];
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const { type, data }: NotifyAdminRequest = await req.json();
    console.log(`[notify-admin] Received request type: ${type}`, data);

    // Input validation
    if (!type || !["devis", "disponibilite", "contact", "reservation", "alert", "report", "reminder"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Type de notification invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let userId: string | undefined;
    const auth = await authenticateRequest(req);
    if (auth) {
      userId = auth.user.id;
    } else if (!PUBLIC_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!data?.name || !data?.email) {
      return new Response(
        JSON.stringify({ error: "Le nom et l'email sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input lengths
    if (data.name.length > 200 || data.email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Données trop longues" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (data.message && data.message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message trop long (max 5000 caractères)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const appUrl = getAppUrl();
    const adminEmails = getAdminEmails();

    // ══════════════════════════════════════════════════════════════════
    // 1. ACCUSÉ DE RÉCEPTION → CLIENT
    // ══════════════════════════════════════════════════════════════════
    const ackResult = await sendClientAcknowledgment(supabaseService, type, data, appUrl);
    if (!ackResult.success) {
      console.warn("[notify-admin] Client acknowledgment failed:", ackResult.error);
    } else {
      console.log("[notify-admin] Client acknowledgment sent to:", data.email);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. NOTIFICATION → TOUS LES ADMINS
    // ══════════════════════════════════════════════════════════════════
    let subject = "";
    let bodyContent = "";
    let subtitle = "";

    switch (type) {
      case "devis":
        subject = `🚨 URGENT – Nouvelle demande de devis de ${data.name}`;
        subtitle = "Nouvelle demande de devis";
        bodyContent = buildDevisBody(data);
        break;
      case "disponibilite":
        subject = `🚨 Demande de disponibilité – ${data.activityTitle || data.accommodationName || "Hébergement"}`;
        subtitle = "Demande de disponibilité";
        bodyContent = buildDisponibiliteBody(data);
        break;
      case "reservation":
        subject = `🚨 URGENT – Nouvelle réservation de ${data.name}`;
        subtitle = "Nouvelle réservation";
        bodyContent = buildReservationBody(data);
        break;
      case "contact":
      default:
        subject = `🚨 Nouveau message de ${data.name}`;
        subtitle = "Nouveau message de contact";
        bodyContent = buildContactBody(data);
    }

    // Add urgent call-to-action directing admins to unified inbox
    const urgentCta = `
      ${separator()}
      <table role="presentation" style="width:100%;background:#FEF3C7;border-radius:12px;border:2px solid #F59E0B;margin:20px 0;">
        <tr><td style="padding:20px;text-align:center;">
          <p style="margin:0 0 8px 0;color:#92400E;font-size:16px;font-weight:700;">⚡ Action requise</p>
          <p style="margin:0 0 15px 0;color:#78350F;font-size:14px;">
            Cette demande doit être traitée dans les plus brefs délais.
          </p>
          <a href="${appUrl}/admin" style="display:inline-block;background-color:#6B8E7F;color:#ffffff;text-decoration:none;padding:14px 35px;border-radius:8px;font-size:15px;font-weight:600;font-family:Georgia,serif;">
            📬 Ouvrir la Boîte Mail Unifiée
          </a>
        </td></tr>
      </table>
    `;

    bodyContent += urgentCta;

    const emailHtml = wrapInBrandedLayout(subtitle, bodyContent, {
      preheader: `${subject} – Action requise immédiatement`,
    });

    const sender = EMAIL_SENDERS.notifications;

    // Send to ALL admins in parallel
    const adminResults = await Promise.allSettled(
      adminEmails.map((adminEmail) =>
        sendEmailWithAudit({
          supabase: supabaseService,
          to: adminEmail,
          from: `${sender.name} <${sender.email}>`,
          subject,
          html: emailHtml,
          type: "notification",
          userId,
        })
      )
    );

    const allSent = adminResults.every(
      (r) => r.status === "fulfilled" && r.value.success
    );
    const anySent = adminResults.some(
      (r) => r.status === "fulfilled" && r.value.success
    );

    if (!anySent) {
      throw new Error("Failed to send notification to any admin");
    }

    console.log(
      `[notify-admin] Sent to ${adminResults.filter((r) => r.status === "fulfilled" && r.value.success).length}/${adminEmails.length} admins`
    );

    return new Response(
      JSON.stringify({ success: true, adminsNotified: adminEmails.length, allSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-admin] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// ══════════════════════════════════════════════════════════════════════
// CLIENT ACKNOWLEDGMENT EMAIL
// ══════════════════════════════════════════════════════════════════════

async function sendClientAcknowledgment(
  supabase: ReturnType<typeof createClient>,
  type: string,
  data: NotifyAdminRequest["data"],
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  const firstName = data.name.split(" ")[0];

  let subject = "";
  let subtitle = "";
  let bodyContent = "";

  switch (type) {
    case "devis":
    case "reservation":
      subject = `✅ Votre demande a bien été reçue – ${data.activityTitle || "An Arwen"}`;
      subtitle = "Confirmation de réception";
      bodyContent = [
        greeting(firstName),
        paragraph(
          `Nous avons bien reçu votre demande${data.activityTitle ? ` pour <strong>${data.activityTitle}</strong>` : ""} et nous vous remercions de votre confiance. 🐴`
        ),
        `<table role="presentation" style="width:100%;background-color:#F0FFF4;border-radius:12px;border-left:4px solid #6B8E7F;margin:20px 0;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 8px 0;color:#065F46;font-size:15px;font-weight:600;">🕐 Prochaine étape</p>
            <p style="margin:0;color:#047857;font-size:14px;line-height:1.6;">
              Notre équipe prend en charge votre demande et vous recontactera <strong>dans les plus brefs délais</strong> (généralement sous 24 à 48h ouvrées) avec un devis personnalisé et toutes les informations nécessaires.
            </p>
          </td></tr>
        </table>`,
        data.totalPrice
          ? `<table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;margin:15px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 5px 0;color:#666;font-size:13px;">Récapitulatif estimatif</p>
                ${data.activityTitle ? `<p style="margin:0 0 5px 0;color:#333;font-size:15px;font-weight:600;">🐎 ${data.activityTitle}</p>` : ""}
                ${data.participants ? `<p style="margin:0 0 5px 0;color:#666;font-size:14px;">👥 ${data.participants} participant${data.participants > 1 ? "s" : ""}</p>` : ""}
                <p style="margin:0;color:#6B8E7F;font-size:18px;font-weight:700;font-family:Georgia,serif;">💰 ${data.totalPrice} €</p>
              </td></tr>
            </table>`
          : "",
        paragraph(
          `En attendant, n'hésitez pas à consulter nos <a href="${appUrl}/destinations" style="color:#6B8E7F;text-decoration:underline;">destinations</a> ou à <a href="${appUrl}/preparer-voyage" style="color:#6B8E7F;text-decoration:underline;">préparer votre voyage</a>.`
        ),
        separator(),
        paragraph(
          `Si vous avez la moindre question, vous pouvez nous répondre directement à cet email ou nous appeler au <strong>06 59 22 62 70</strong>.`
        ),
        `<p style="margin:20px 0 0 0;color:#333;font-size:15px;line-height:1.6;">
          À très bientôt en selle ! 🌿<br/>
          <strong>L'équipe An Arwen</strong>
        </p>`,
      ].join("");
      break;

    case "contact":
    default:
      subject = `✅ Message bien reçu – Ferme Équestre An Arwen`;
      subtitle = "Confirmation de réception";
      bodyContent = [
        greeting(firstName),
        paragraph(
          `Nous avons bien reçu votre message et nous vous remercions de nous avoir contactés. 🐴`
        ),
        `<table role="presentation" style="width:100%;background-color:#F0FFF4;border-radius:12px;border-left:4px solid #6B8E7F;margin:20px 0;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 8px 0;color:#065F46;font-size:15px;font-weight:600;">🕐 Délai de réponse</p>
            <p style="margin:0;color:#047857;font-size:14px;line-height:1.6;">
              Nous traitons chaque message avec attention. Vous recevrez une réponse personnalisée <strong>sous 24 à 48h ouvrées</strong>.
            </p>
          </td></tr>
        </table>`,
        paragraph(
          `Pour toute urgence, n'hésitez pas à nous appeler directement au <strong>06 59 22 62 70</strong>.`
        ),
        separator(),
        `<p style="margin:20px 0 0 0;color:#333;font-size:15px;line-height:1.6;">
          À très bientôt ! 🌿<br/>
          <strong>L'équipe An Arwen</strong>
        </p>`,
      ].join("");
      break;

    case "disponibilite":
      subject = `✅ Demande de disponibilité reçue – ${data.activityTitle || data.accommodationName || "An Arwen"}`;
      subtitle = "Confirmation de réception";
      bodyContent = [
        greeting(firstName),
        paragraph(
          `Votre demande de disponibilité${data.activityTitle ? ` pour <strong>${data.activityTitle}</strong>` : ""}${data.accommodationName ? ` pour <strong>${data.accommodationName}</strong>` : ""} a bien été enregistrée. 🐴`
        ),
        `<table role="presentation" style="width:100%;background-color:#F0FFF4;border-radius:12px;border-left:4px solid #6B8E7F;margin:20px 0;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 8px 0;color:#065F46;font-size:15px;font-weight:600;">🕐 Prochaine étape</p>
            <p style="margin:0;color:#047857;font-size:14px;line-height:1.6;">
              Nous vérifions nos disponibilités et vous recontacterons <strong>dans les plus brefs délais</strong> avec une proposition adaptée.
            </p>
          </td></tr>
        </table>`,
        paragraph(
          `Pour toute urgence, appelez-nous au <strong>06 59 22 62 70</strong>.`
        ),
        separator(),
        `<p style="margin:20px 0 0 0;color:#333;font-size:15px;line-height:1.6;">
          À très bientôt ! 🌿<br/>
          <strong>L'équipe An Arwen</strong>
        </p>`,
      ].join("");
      break;
  }

  const emailHtml = wrapInBrandedLayout(subtitle, bodyContent, {
    preheader: subject,
    ctaUrl: `${appUrl}/mon-espace`,
    ctaLabel: "Accéder à mon Espace Voyage",
  });

  const sender = EMAIL_SENDERS.contact;
  return sendEmailWithAudit({
    supabase,
    to: data.email,
    from: `${sender.name} <${sender.email}>`,
    subject,
    html: emailHtml,
    type: "notification",
  });
}

// ── Admin body builders ─────────────────────────────────────────────

function contactLine(label: string, value: string, href?: string): string {
  const display = href ? `<a href="${href}" style="color:#6B8E7F;text-decoration:none;">${value}</a>` : value;
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #F0EDE8;color:#888;font-size:13px;width:120px;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #F0EDE8;color:#333;font-size:14px;">${display}</td></tr>`;
}

function contactTable(rows: string): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:15px 0;">${rows}</table>`;
}

function buildDevisBody(data: NotifyAdminRequest["data"]): string {
  return [
    `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:18px;">Coordonnées du demandeur</h2>`,
    contactTable(
      contactLine("Nom", data.name) +
      contactLine("Email", data.email, `mailto:${data.email}`) +
      (data.phone ? contactLine("Téléphone", data.phone, `tel:${data.phone}`) : "") +
      (data.participants ? contactLine("Participants", `${data.participants}`) : "")
    ),
    data.subject ? `<h3 style="color:#8B7D6B;margin:20px 0 10px 0;">Sujet : ${data.subject}</h3>` : "",
    data.message ? `<div style="background:#FAFAF8;padding:18px;border-radius:8px;border-left:3px solid #C9B896;margin:15px 0;">
      <p style="white-space:pre-wrap;margin:0;color:#555;font-size:14px;line-height:1.6;">${data.message}</p>
    </div>` : "",
  ].join("");
}

function buildDisponibiliteBody(data: NotifyAdminRequest["data"]): string {
  return [
    `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:18px;">Demandeur</h2>`,
    contactTable(
      contactLine("Nom", data.name) +
      contactLine("Email", data.email, `mailto:${data.email}`) +
      (data.phone ? contactLine("Téléphone", data.phone, `tel:${data.phone}`) : "")
    ),
    separator(),
    `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:18px;">Détails de la demande</h2>`,
    contactTable(
      (data.date ? contactLine("Date souhaitée", data.date) : "") +
      (data.activityTitle ? contactLine("Activité", data.activityTitle) : "") +
      (data.accommodationName ? contactLine("Hébergement", data.accommodationName) : "") +
      (data.participants ? contactLine("Participants", `${data.participants}`) : "")
    ),
    data.message ? paragraph(data.message) : "",
  ].join("");
}

function buildReservationBody(data: NotifyAdminRequest["data"]): string {
  return [
    `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:18px;">🎉 Client</h2>`,
    contactTable(
      contactLine("Nom", data.name) +
      contactLine("Email", data.email, `mailto:${data.email}`) +
      (data.phone ? contactLine("Téléphone", data.phone, `tel:${data.phone}`) : "")
    ),
    separator(),
    `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:18px;">Réservation</h2>`,
    contactTable(
      (data.date ? contactLine("Date", data.date) : "") +
      (data.activityTitle ? contactLine("Activité", data.activityTitle) : "") +
      (data.accommodationName ? contactLine("Hébergement", data.accommodationName) : "") +
      (data.participants ? contactLine("Participants", `${data.participants}`) : "") +
      (data.totalPrice ? contactLine("Total", `${data.totalPrice} €`) : "") +
      (data.depositAmount ? contactLine("Acompte", `${data.depositAmount} €`) : "") +
      (data.paymentOption ? contactLine("Paiement", data.paymentOption) : "")
    ),
    data.message ? `<div style="background:#FAFAF8;padding:15px;border-radius:8px;margin:15px 0;">
      <p style="margin:0 0 5px 0;font-weight:600;color:#333;font-size:14px;">Notes :</p>
      <p style="margin:0;color:#555;font-size:14px;">${data.message}</p>
    </div>` : "",
  ].join("");
}

function buildContactBody(data: NotifyAdminRequest["data"]): string {
  return [
    contactTable(
      contactLine("Nom", data.name) +
      contactLine("Email", data.email, `mailto:${data.email}`) +
      (data.phone ? contactLine("Téléphone", data.phone, `tel:${data.phone}`) : "")
    ),
    data.subject ? `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:20px 0 10px 0;font-size:18px;">Sujet : ${data.subject}</h2>` : "",
    data.message ? `<div style="background:#FAFAF8;padding:18px;border-radius:8px;border-left:3px solid #6B8E7F;margin:15px 0;">
      <p style="white-space:pre-wrap;margin:0;color:#555;font-size:14px;line-height:1.6;">${data.message}</p>
    </div>` : "",
  ].join("");
}

serve(handler);
