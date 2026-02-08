import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, badge,
  formatDate,
} from "../_shared/email-templates.ts";

interface Quote {
  id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  activity_title: string;
  status: string;
  updated_at: string;
  validation_notification_sent: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  console.log("[check-unread-quotes] Starting scheduled check...");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from("quotes")
      .select("id, user_id, client_name, client_email, activity_title, status, updated_at, validation_notification_sent")
      .in("status", ["validated", "accepted", "signed"])
      .lt("updated_at", oneHourAgo)
      .eq("validation_notification_sent", false);

    if (quotesError) throw quotesError;

    console.log(`[check-unread-quotes] Found ${quotes?.length || 0} quotes to process`);

    if (!quotes || quotes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No quotes to process", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailsSent = 0;
    let skipped = 0;
    let errors = 0;

    for (const quote of quotes) {
      try {
        let shouldSendEmail = true;

        if (quote.user_id) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(quote.user_id);
          if (userData?.user?.last_sign_in_at) {
            const lastSignIn = new Date(userData.user.last_sign_in_at);
            const quoteUpdated = new Date(quote.updated_at);
            if (lastSignIn > quoteUpdated) {
              shouldSendEmail = false;
              await supabaseAdmin.from("quotes").update({ validation_notification_sent: true }).eq("id", quote.id);
              skipped++;
              continue;
            }
          }
        }

        if (shouldSendEmail) {
          const emailHtml = buildReminderEmail(quote);

          const sender = EMAIL_SENDERS.relance;
          const result = await sendEmailWithAudit({
            supabase: supabaseAdmin,
            to: quote.client_email,
            from: `${sender.name} <${sender.email}>`,
            subject: `Bonne nouvelle ! Votre voyage « ${quote.activity_title} » se concrétise 🐎`,
            html: emailHtml,
            type: "reminder",
            userId: quote.user_id || undefined,
            referenceId: quote.id,
          });

          if (result.success) {
            await supabaseAdmin.from("quotes").update({ validation_notification_sent: true }).eq("id", quote.id);
            emailsSent++;
          } else {
            errors++;
          }
        }
      } catch {
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${quotes.length} quotes`, emailsSent, skipped, errors }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[check-unread-quotes] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function buildReminderEmail(quote: Quote): string {
  const appUrl = getAppUrl();

  const body = [
    greeting(quote.client_name),
    paragraph("Excellente nouvelle ! Votre devis pour <strong>" + quote.activity_title + "</strong> a été validé par notre équipe."),
    paragraph("Il ne vous reste plus qu'à vous connecter à votre espace personnel pour finaliser votre dossier et procéder au versement de l'acompte."),
    `<div style="text-align:center;margin:25px 0;">
      <table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;">
        <tr><td style="padding:25px;text-align:center;">
          ${badge("✅ Devis validé")}
          <h2 style="margin:15px 0 0 0;color:#333;font-size:20px;font-weight:600;font-family:Georgia,serif;">${quote.activity_title}</h2>
        </td></tr>
      </table>
    </div>`,
    paragraph("Nous restons à votre entière disposition pour toute question. À très bientôt sur les sentiers !"),
  ].join("");

  return wrapInBrandedLayout("Votre voyage se concrétise 🐎", body, {
    preheader: `Votre devis pour ${quote.activity_title} est validé !`,
    ctaUrl: `${appUrl}/mon-espace`,
    ctaLabel: "Accéder à mon Espace",
  });
}

serve(handler);
