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
    const today = new Date().toISOString().split("T")[0];

    // Find quotes that are expired (valid_until < today) and still in draft/sent status
    const { data: expiredQuotes, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .in("status", ["draft", "sent"])
      .lt("valid_until", today)
      .order("valid_until", { ascending: true });

    if (fetchError) {
      console.error("[relance-devis] Error fetching quotes:", fetchError);
      throw new Error("Impossible de récupérer les devis expirés");
    }

    if (!expiredQuotes || expiredQuotes.length === 0) {
      console.log("[relance-devis] Aucun devis expiré à relancer");
      return new Response(
        JSON.stringify({ success: true, relanced: 0, message: "Aucun devis expiré à relancer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[relance-devis] ${expiredQuotes.length} devis expirés trouvés`);

    // Check which quotes already received a relance recently (last 7 days)
    const quoteIds = expiredQuotes.map(q => q.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentRelances } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "reminder")
      .gte("sent_at", sevenDaysAgo)
      .in("reference_id", quoteIds);

    const alreadyRelanced = new Set(recentRelances?.map(r => r.reference_id) || []);

    const sender = EMAIL_SENDERS.relance;
    let sentCount = 0;
    let skippedCount = 0;
    const results: Array<{ quote_number: string; client: string; status: string }> = [];

    for (const quote of expiredQuotes) {
      // Skip if already relanced in the last 7 days
      if (alreadyRelanced.has(quote.id)) {
        skippedCount++;
        results.push({ quote_number: quote.quote_number, client: quote.client_name, status: "skipped_recent" });
        continue;
      }

      const daysExpired = Math.floor(
        (new Date(today).getTime() - new Date(quote.valid_until).getTime()) / (1000 * 60 * 60 * 24)
      );

      const bodyContent = [
        paragraph(`Bonjour ${quote.client_name},`),
        paragraph(`Nous espérons que vous allez bien ! Nous revenons vers vous concernant votre devis <strong>${quote.quote_number}</strong> pour <strong>${quote.activity_title}</strong>.`),
        separator(),
        `<div style="background:#F5F3F0;padding:20px;border-radius:12px;border-left:4px solid #C9B896;margin:20px 0;">
          <p style="margin:5px 0;font-size:14px;color:#555;">📋 <strong>Devis :</strong> ${quote.quote_number}</p>
          <p style="margin:5px 0;font-size:14px;color:#555;">🐴 <strong>Activité :</strong> ${quote.activity_title}</p>
          ${quote.start_date ? `<p style="margin:5px 0;font-size:14px;color:#555;">📅 <strong>Date :</strong> ${formatDate(quote.start_date)}</p>` : ""}
          <p style="margin:5px 0;font-size:14px;color:#555;">👥 <strong>Participants :</strong> ${quote.participants}</p>
          <p style="margin:5px 0;font-size:14px;color:#555;">💶 <strong>Montant :</strong> ${formatPrice(quote.total_price)}</p>
          <p style="margin:5px 0;font-size:14px;color:#C9896B;">⏰ <strong>Expiré depuis :</strong> ${daysExpired} jour${daysExpired > 1 ? "s" : ""}</p>
        </div>`,
        paragraph("Ce devis a expiré mais nous serions ravis de le prolonger pour vous ! Les places étant limitées, nous vous invitons à nous recontacter rapidement."),
        paragraph("N'hésitez pas à nous écrire ou à nous appeler pour toute question. 🐎"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("Votre devis vous attend", bodyContent, {
        preheader: `Votre devis ${quote.quote_number} pour ${quote.activity_title} expire bientôt`,
        ctaUrl: `${appUrl}/contact`,
        ctaLabel: "Nous recontacter",
        footerExtra: `<p style="margin:0;color:#888;font-size:12px;text-align:center;">Réf. devis : ${quote.quote_number}</p>`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: quote.client_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🐴 Votre devis ${quote.quote_number} vous attend toujours !`,
        html: htmlContent,
        type: "reminder",
        referenceId: quote.id,
      });

      if (result.success) {
        sentCount++;
        results.push({ quote_number: quote.quote_number, client: quote.client_name, status: "sent" });
        console.log(`[relance-devis] ✅ Relance envoyée à ${quote.client_email} (devis ${quote.quote_number})`);
      } else {
        results.push({ quote_number: quote.quote_number, client: quote.client_name, status: `failed: ${result.error}` });
        console.error(`[relance-devis] ❌ Échec pour ${quote.client_email}: ${result.error}`);
      }

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[relance-devis] Terminé: ${sentCount} envoyés, ${skippedCount} ignorés (déjà relancés)`);

    return new Response(
      JSON.stringify({
        success: true,
        relanced: sentCount,
        skipped: skippedCount,
        total: expiredQuotes.length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[relance-devis] Erreur:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
