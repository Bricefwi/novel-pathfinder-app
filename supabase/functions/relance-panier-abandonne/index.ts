import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  formatDate, formatPrice, paragraph, separator,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const appUrl = getAppUrl();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // Find quotes created 48-72h ago still in draft status (abandoned)
    const { data: abandonedQuotes, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("status", "draft")
      .lte("created_at", twoDaysAgo)
      .gte("created_at", threeDaysAgo);

    if (error) throw new Error(`Fetch error: ${error.message}`);

    if (!abandonedQuotes || abandonedQuotes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun devis abandonné" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-duplicate: check recent reminders (7 days)
    const quoteIds = abandonedQuotes.map(q => q.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "reminder")
      .like("subject", "%abandonné%")
      .gte("sent_at", sevenDaysAgo)
      .in("reference_id", quoteIds);

    const alreadySent = new Set(recent?.map(r => r.reference_id) || []);
    const sender = EMAIL_SENDERS.relance;
    let sentCount = 0;

    for (const quote of abandonedQuotes) {
      if (alreadySent.has(quote.id)) continue;

      const body = [
        paragraph(`Bonjour ${quote.client_name},`),
        paragraph(`Nous avons remarqué que vous aviez commencé un devis pour <strong>${quote.activity_title}</strong> mais ne l'avez pas encore finalisé.`),
        separator(),
        `<div style="background:#F5F3F0;padding:25px;border-radius:12px;border-left:4px solid #C9B896;margin:20px 0;">
          <p style="margin:0 0 8px 0;font-size:16px;font-family:Georgia,serif;color:#333;">📋 Récapitulatif de votre devis</p>
          <p style="margin:5px 0;font-size:14px;color:#555;">🐴 <strong>${quote.activity_title}</strong></p>
          ${quote.start_date ? `<p style="margin:5px 0;font-size:14px;color:#555;">📅 ${formatDate(quote.start_date)}</p>` : ""}
          <p style="margin:5px 0;font-size:14px;color:#555;">👥 ${quote.participants} participant${quote.participants > 1 ? "s" : ""}</p>
          <p style="margin:5px 0;font-size:14px;color:#6B8E7F;font-weight:600;">💶 ${formatPrice(quote.total_price)}</p>
        </div>`,
        paragraph("Les places sont limitées et nous serions ravis de vous accueillir. Finalisez votre réservation en un clic ! 🌿"),
        paragraph("Une question ? N'hésitez pas à nous contacter, nous sommes là pour vous guider. 🐎"),
      ].join("");

      const html = wrapInBrandedLayout("Votre devis vous attend", body, {
        preheader: `Votre devis pour ${quote.activity_title} n'attend que vous !`,
        ctaUrl: `${appUrl}/mon-espace`,
        ctaLabel: "Finaliser mon devis",
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: quote.client_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🐴 Votre devis pour ${quote.activity_title} n'est pas finalisé`,
        html,
        type: "reminder",
        referenceId: quote.id,
      });

      if (result.success) sentCount++;
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: abandonedQuotes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[relance-panier]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
