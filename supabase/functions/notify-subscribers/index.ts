import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { logEmailAudit, EmailType } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  paragraph,
} from "../_shared/email-templates.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface NotifySubscribersRequest {
  type: "nouvelle_activite" | "nouveau_sejour" | "nouvel_article";
  data: {
    title: string;
    description?: string;
    activityType?: string;
    location?: string;
    startDate?: string;
    price?: number;
    imageUrl?: string;
  };
}

const activityTypeLabels: Record<string, string> = {
  randonnee: "Randonnée équestre",
  sejour: "Séjour à la ferme",
  stage: "Stage équitation",
  evenement: "Événement spécial",
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) return createAuthErrorResponse("Authentication required", 401, corsHeaders);

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) return createAuthErrorResponse("Admin access required", 403, corsHeaders);

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, data }: NotifySubscribersRequest = await req.json();
    console.log(`[notify-subscribers] Received request type: ${type}`, data);

    const { data: subscribers, error: fetchError } = await supabaseService
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("newsletter_subscribed", true);

    if (fetchError) throw fetchError;

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No subscribers" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: usersData, error: usersError } = await supabaseService.auth.admin.listUsers();
    if (usersError) throw usersError;

    const subscriberEmails = subscribers
      .map(sub => usersData.users.find(u => u.id === sub.user_id)?.email)
      .filter(Boolean) as string[];

    if (subscriberEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No valid emails" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[notify-subscribers] Sending to ${subscriberEmails.length} subscribers`);

    const appUrl = getAppUrl();
    const { subject, htmlContent } = buildNotificationEmail(type, data, appUrl);
    const sender = EMAIL_SENDERS.newsletter;

    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < subscriberEmails.length; i += batchSize) {
      const batch = subscriberEmails.slice(i, i + batchSize);

      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY! },
          body: JSON.stringify({
            sender: { name: sender.name, email: sender.email },
            to: batch.map((email: string) => ({ email })),
            subject,
            htmlContent,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          for (const email of batch) {
            await logEmailAudit(supabaseService, { recipient: email, type: "newsletter" as EmailType, subject, status: "failed", error_message: errorText });
          }
          errorCount += batch.length;
        } else {
          await res.json();
          for (const email of batch) {
            await logEmailAudit(supabaseService, { recipient: email, type: "newsletter" as EmailType, subject, status: "sent" });
          }
          successCount += batch.length;
        }
      } catch {
        errorCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, subscribersCount: subscriberEmails.length, successCount, errorCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[notify-subscribers] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function buildNotificationEmail(
  type: NotifySubscribersRequest["type"],
  data: NotifySubscribersRequest["data"],
  appUrl: string
): { subject: string; htmlContent: string } {
  let subject = "";
  let subtitle = "";
  let bodyContent = "";
  let ctaUrl = appUrl;
  let ctaLabel = "Découvrir";

  switch (type) {
    case "nouvelle_activite":
    case "nouveau_sejour": {
      const typeLabel = activityTypeLabels[data.activityType || ""] || "Nouvelle activité";
      subject = `🐴 ${typeLabel} : ${data.title}`;
      subtitle = typeLabel;
      ctaUrl = `${appUrl}/planning`;
      ctaLabel = "Voir les disponibilités";

      const detailRows = [
        data.location ? `<p style="margin:5px 0;font-size:14px;color:#555;">📍 <strong>Lieu :</strong> ${data.location}</p>` : "",
        data.startDate ? `<p style="margin:5px 0;font-size:14px;color:#555;">📅 <strong>Date :</strong> ${data.startDate}</p>` : "",
        data.price ? `<p style="margin:5px 0;font-size:14px;color:#555;">💶 <strong>À partir de :</strong> ${data.price} €</p>` : "",
      ].join("");

      bodyContent = [
        `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:22px;">${data.title}</h2>`,
        data.description ? paragraph(data.description) : "",
        detailRows ? `<div style="background:#F5F3F0;padding:20px;border-radius:12px;border-left:4px solid #6B8E7F;margin:20px 0;">${detailRows}</div>` : "",
      ].join("");
      break;
    }

    case "nouvel_article":
      subject = `📖 Nouveau sur le Carnet de Voyage : ${data.title}`;
      subtitle = "Carnet de Voyage";
      ctaUrl = `${appUrl}/carnet-de-voyage`;
      ctaLabel = "Lire l'article";

      bodyContent = [
        `<h2 style="color:#6B8E7F;font-family:Georgia,serif;margin:0 0 15px 0;font-size:22px;">${data.title}</h2>`,
        data.description ? paragraph(data.description) : "",
      ].join("");
      break;
  }

  const htmlContent = wrapInBrandedLayout(subtitle, bodyContent, {
    preheader: subject,
    ctaUrl,
    ctaLabel,
    unsubscribeUrl: `${appUrl}/mon-espace`,
    footerExtra: `<p style="margin:0;color:#888;font-size:12px;text-align:center;">Vous recevez cet email car vous êtes abonné(e) à la newsletter An Arwen.</p>`,
  });

  return { subject, htmlContent };
}

serve(handler);
