import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest, ALLOWED_ORIGINS } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

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
  };
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Authentification
    const auth = await authenticateRequest(req);
    if (!auth) {
      console.error("[notify-admin] Authentication failed");
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    console.log(`[notify-admin] Authenticated user: ${auth.user.id}`);

    const { type, data }: NotifyAdminRequest = await req.json();
    console.log(`[notify-admin] Received request type: ${type}`, data);

    // Récupérer l'email admin depuis les secrets
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "contact@ferme-equestre-arwen.com";
    const systemSenderEmail = Deno.env.get("EMAIL_FROM_SYSTEM") || "Notifications An Arwen <notifications@ferme-equestre-arwen.com>";

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "devis":
        subject = `📋 Nouvelle demande de devis de ${data.name}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Nouvelle demande de devis</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #6B8E7F; margin-top: 0;">Coordonnées</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Nom:</strong> ${data.name}</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
                ${data.phone ? `<li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Téléphone:</strong> <a href="tel:${data.phone}">${data.phone}</a></li>` : ""}
                ${data.participants ? `<li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Participants:</strong> ${data.participants}</li>` : ""}
              </ul>
              ${data.subject ? `<h3 style="color: #8B7D6B;">Sujet: ${data.subject}</h3>` : ""}
              ${data.message ? `<div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;"><h3 style="margin-top: 0;">Détails de la demande</h3><p style="white-space: pre-wrap;">${data.message}</p></div>` : ""}
            </div>
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">Email envoyé automatiquement depuis le site An Arwen</p>
          </div>
        `;
        break;

      case "disponibilite":
        subject = `📅 Demande de disponibilité - ${data.activityTitle || data.accommodationName || "Hébergement"}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Demande de disponibilité</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #6B8E7F; margin-top: 0;">Demandeur</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;"><strong>Nom:</strong> ${data.name}</li>
                <li style="padding: 8px 0;"><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
                ${data.phone ? `<li style="padding: 8px 0;"><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
              </ul>
              <h2 style="color: #6B8E7F;">Détails</h2>
              <ul style="list-style: none; padding: 0;">
                ${data.date ? `<li style="padding: 8px 0;"><strong>Date demandée:</strong> ${data.date}</li>` : ""}
                ${data.activityTitle ? `<li style="padding: 8px 0;"><strong>Activité:</strong> ${data.activityTitle}</li>` : ""}
                ${data.accommodationName ? `<li style="padding: 8px 0;"><strong>Hébergement:</strong> ${data.accommodationName}</li>` : ""}
                ${data.participants ? `<li style="padding: 8px 0;"><strong>Participants:</strong> ${data.participants}</li>` : ""}
              </ul>
              ${data.message ? `<p style="margin-top: 20px;">${data.message}</p>` : ""}
            </div>
          </div>
        `;
        break;

      case "reservation":
        subject = `🐴 Nouvelle réservation de ${data.name}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0;">🎉 Nouvelle réservation</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #6B8E7F; margin-top: 0;">Client</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;"><strong>Nom:</strong> ${data.name}</li>
                <li style="padding: 8px 0;"><strong>Email:</strong> ${data.email}</li>
                ${data.phone ? `<li style="padding: 8px 0;"><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
              </ul>
              <h2 style="color: #6B8E7F;">Réservation</h2>
              <ul style="list-style: none; padding: 0;">
                ${data.date ? `<li style="padding: 8px 0;"><strong>Date:</strong> ${data.date}</li>` : ""}
                ${data.activityTitle ? `<li style="padding: 8px 0;"><strong>Activité:</strong> ${data.activityTitle}</li>` : ""}
                ${data.accommodationName ? `<li style="padding: 8px 0;"><strong>Hébergement:</strong> ${data.accommodationName}</li>` : ""}
                ${data.participants ? `<li style="padding: 8px 0;"><strong>Participants:</strong> ${data.participants}</li>` : ""}
              </ul>
              ${data.message ? `<p><strong>Notes:</strong> ${data.message}</p>` : ""}
            </div>
          </div>
        `;
        break;

      case "contact":
      default:
        subject = `✉️ Nouveau message de ${data.name}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Nouveau message de contact</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;"><strong>Nom:</strong> ${data.name}</li>
                <li style="padding: 8px 0;"><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
                ${data.phone ? `<li style="padding: 8px 0;"><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
              </ul>
              ${data.subject ? `<h2 style="color: #6B8E7F;">Sujet: ${data.subject}</h2>` : ""}
              ${data.message ? `<div style="background: #f9f9f9; padding: 15px; border-radius: 8px;"><p style="white-space: pre-wrap; margin: 0;">${data.message}</p></div>` : ""}
            </div>
          </div>
        `;
    }

    // Créer un client service pour le logging
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Envoyer l'email avec audit
    const result = await sendEmailWithAudit({
      supabase: supabaseService,
      to: adminEmail,
      from: systemSenderEmail,
      subject: subject,
      html: htmlContent,
      type: "notification",
      userId: auth.user.id,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

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
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
