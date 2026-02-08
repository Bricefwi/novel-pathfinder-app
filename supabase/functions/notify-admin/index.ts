import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout,
  greeting, paragraph, separator,
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

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const { type, data }: NotifyAdminRequest = await req.json();
    console.log(`[notify-admin] Received request type: ${type}`, data);

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

    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "contact@ferme-equestre-arwen.com";

    let subject = "";
    let bodyContent = "";
    let subtitle = "";

    switch (type) {
      case "devis":
        subject = `📋 Nouvelle demande de devis de ${data.name}`;
        subtitle = "Nouvelle demande de devis";
        bodyContent = buildDevisBody(data);
        break;
      case "disponibilite":
        subject = `📅 Demande de disponibilité – ${data.activityTitle || data.accommodationName || "Hébergement"}`;
        subtitle = "Demande de disponibilité";
        bodyContent = buildDisponibiliteBody(data);
        break;
      case "reservation":
        subject = `🐴 Nouvelle réservation de ${data.name}`;
        subtitle = "Nouvelle réservation";
        bodyContent = buildReservationBody(data);
        break;
      case "contact":
      default:
        subject = `✉️ Nouveau message de ${data.name}`;
        subtitle = "Nouveau message de contact";
        bodyContent = buildContactBody(data);
    }

    const emailHtml = wrapInBrandedLayout(subtitle, bodyContent, {
      preheader: subject,
    });

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sender = EMAIL_SENDERS.notifications;
    const result = await sendEmailWithAudit({
      supabase: supabaseService,
      to: adminEmail,
      from: `${sender.name} <${sender.email}>`,
      subject,
      html: emailHtml,
      type: "notification",
      userId,
    });

    if (!result.success) throw new Error(result.error);

    console.log("[notify-admin] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-admin] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// ── Body builders ───────────────────────────────────────────────────

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
