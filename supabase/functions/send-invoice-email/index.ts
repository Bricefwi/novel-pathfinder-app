import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, activityCard, pricingTable, priceRow, infoCard, badge,
  formatDate, formatPrice,
} from "../_shared/email-templates.ts";

interface InvoiceEmailRequest {
  invoice_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { invoice_id }: InvoiceEmailRequest = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: "invoice_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-invoice-email] Processing invoice:", invoice_id);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices").select("*").eq("id", invoice_id).single();

    if (invoiceError || !invoice) {
      console.error("[send-invoice-email] Invoice not found:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invoice.client_email)) {
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Build email ──
    const appUrl = getAppUrl();
    const isPaid = invoice.payment_status === "paid";
    const hasPartialPayment = invoice.amount_paid && invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_amount;

    const paymentStatusHtml = isPaid
      ? infoCard(`<p style="margin:0;color:#2E7D32;font-size:15px;font-weight:600;">✅ Facture acquittée</p>`, "#4CAF50")
      : infoCard(`
          <p style="margin:0 0 5px 0;color:#8B7D6B;font-size:14px;font-weight:600;">⏳ En attente de règlement</p>
          ${invoice.due_date ? `<p style="margin:0 0 5px 0;color:#8B7D6B;font-size:14px;">Échéance : <strong>${formatDate(invoice.due_date)}</strong></p>` : ""}
          ${hasPartialPayment ? `
            <p style="margin:5px 0 0 0;color:#8B7D6B;font-size:14px;">Montant versé : ${formatPrice(invoice.amount_paid)}</p>
            <p style="margin:5px 0 0 0;color:#8B7D6B;font-size:16px;font-weight:600;">Reste à payer : ${formatPrice(invoice.total_amount - invoice.amount_paid)}</p>
          ` : ""}
        `);

    const taxRows = invoice.tax_amount > 0
      ? priceRow(`TVA (${invoice.tax_rate || 20}%)`, formatPrice(invoice.tax_amount))
      : "";

    const body = [
      greeting(invoice.client_name),
      paragraph("Veuillez trouver ci-dessous votre facture pour la prestation réalisée. Nous vous remercions de votre confiance."),
      `<div style="text-align:center;margin:15px 0;">${badge(`Facture N° ${invoice.invoice_number}`)}</div>`,
      activityCard({
        title: invoice.activity_title,
        duration: invoice.activity_duration,
        startDate: invoice.start_date,
        endDate: invoice.end_date,
        participants: invoice.participants,
      }),
      pricingTable(
        priceRow("Sous-total HT", formatPrice(invoice.subtotal)) +
        taxRows +
        priceRow("Total TTC", formatPrice(invoice.total_amount), true)
      ),
      paymentStatusHtml,
      invoice.notes ? `<table role="presentation" style="width:100%;margin:20px 0;">
        <tr><td style="padding:15px;background-color:#FAFAF8;border-radius:8px;">
          <p style="margin:0 0 5px 0;color:#333;font-size:14px;font-weight:600;">Notes :</p>
          <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">${invoice.notes}</p>
        </td></tr>
      </table>` : "",
    ].join("");

    const emailHtml = wrapInBrandedLayout("Votre facture", body, {
      preheader: `Facture ${invoice.invoice_number} – ${invoice.activity_title}`,
      ctaUrl: `${appUrl}/mon-espace`,
      ctaLabel: "Consulter ma facture",
      footerExtra: `
        <p style="margin:0 0 8px 0;color:#666;font-size:12px;line-height:1.5;">
          <strong>Mentions légales :</strong> ${COMPANY_LEGAL}
        </p>
        <p style="margin:0;color:#888;font-size:11px;line-height:1.5;">
          <strong>Conditions de paiement :</strong> Paiement à réception. En cas de retard, pénalité de 3× le taux d'intérêt légal + indemnité forfaitaire de 40 € pour frais de recouvrement.
        </p>
      `,
    });

    // ── Send ──
    const sender = EMAIL_SENDERS.factures;
    const result = await sendEmailWithAudit({
      supabase,
      to: invoice.client_email,
      from: `${sender.name} <${sender.email}>`,
      subject: `Facture ${invoice.invoice_number} – ${invoice.activity_title}`,
      html: emailHtml,
      type: "invoice",
      userId: invoice.user_id,
      referenceId: invoice.id,
    });

    if (!result.success) throw new Error(result.error);

    console.log("[send-invoice-email] Email sent successfully to:", invoice.client_email);

    // Send BCC copies to all admins
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminEmails) {
      if (adminEmail.toLowerCase() === invoice.client_email.toLowerCase()) continue;
      await sendEmailWithAudit({
        supabase,
        to: adminEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: `[Copie] Facture ${invoice.invoice_number} – ${invoice.activity_title} → ${invoice.client_name}`,
        html: emailHtml,
        type: "invoice",
        referenceId: invoice.id,
      });
    }
    console.log(`[send-invoice-email] Admin copies sent to ${adminEmails.length} admins`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-invoice-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

const COMPANY_LEGAL = "Ferme Équestre An Arwen – SIRET 80266354200016 – Non assujetti à la TVA, art. 293 B du CGI";

serve(handler);
