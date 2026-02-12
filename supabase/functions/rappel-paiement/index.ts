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

    // Find invoices due in 3 days that are unpaid
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .in("payment_status", ["pending", "unpaid", null])
      .gte("due_date", twoDaysFromNow)
      .lte("due_date", threeDaysFromNow);

    if (error) throw new Error(error.message);

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun rappel de paiement" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-duplicate (7 days)
    const invoiceIds = invoices.map(i => i.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "reminder")
      .like("subject", "%paiement%")
      .gte("sent_at", sevenDaysAgo)
      .in("reference_id", invoiceIds);

    const alreadySent = new Set(recent?.map(r => r.reference_id) || []);
    const sender = EMAIL_SENDERS.factures;
    let sentCount = 0;

    for (const invoice of invoices) {
      if (alreadySent.has(invoice.id)) continue;

      const remaining = invoice.total_amount - (invoice.amount_paid || 0);

      const body = [
        paragraph(`Bonjour ${invoice.client_name},`),
        paragraph(`Nous vous rappelons que votre facture <strong>${invoice.invoice_number}</strong> arrive à échéance le <strong>${formatDate(invoice.due_date)}</strong>.`),
        separator(),
        `<div style="background:#FFF3E0;padding:25px;border-radius:12px;border-left:4px solid #FF9800;margin:20px 0;">
          <p style="margin:0 0 12px 0;font-size:16px;font-family:Georgia,serif;color:#333;">💳 Détails de la facture</p>
          <table role="presentation" style="width:100%;">
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Facture n°</td><td style="text-align:right;font-weight:600;color:#333;">${invoice.invoice_number}</td></tr>
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Activité</td><td style="text-align:right;color:#333;">${invoice.activity_title}</td></tr>
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Montant total</td><td style="text-align:right;color:#333;">${formatPrice(invoice.total_amount)}</td></tr>
            ${invoice.amount_paid ? `<tr><td style="padding:5px 0;font-size:14px;color:#555;">Déjà réglé</td><td style="text-align:right;color:#4CAF50;">${formatPrice(invoice.amount_paid)}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-size:16px;font-weight:600;color:#333;border-top:1px solid #ddd;">Reste à payer</td><td style="text-align:right;font-size:18px;font-weight:700;color:#FF9800;border-top:1px solid #ddd;">${formatPrice(remaining)}</td></tr>
          </table>
          <p style="margin:12px 0 0 0;font-size:13px;color:#999;">📅 Échéance : ${formatDate(invoice.due_date)}</p>
        </div>`,
        paragraph("Merci de procéder au règlement avant la date d'échéance. N'hésitez pas à nous contacter pour toute question. 🐴"),
      ].join("");

      const html = wrapInBrandedLayout("Rappel de paiement", body, {
        preheader: `Facture ${invoice.invoice_number} – échéance dans 3 jours`,
        ctaUrl: `${appUrl}/mon-espace`,
        ctaLabel: "Consulter ma facture",
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: invoice.client_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `💳 Rappel : facture ${invoice.invoice_number} – paiement à venir`,
        html,
        type: "reminder",
        referenceId: invoice.id,
      });

      if (result.success) sentCount++;
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: invoices.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[rappel-paiement]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
