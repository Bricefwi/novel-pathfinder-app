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

interface QuoteEmailRequest {
  quote_id?: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  activity_title: string;
  activity_duration?: string;
  start_date?: string;
  end_date?: string;
  participants: number;
  unit_price: number;
  total_price: number;
  deposit_amount: number;
  deposit_percentage: number;
  valid_until?: string;
  notes?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const quoteData: QuoteEmailRequest = await req.json();
    console.log("[send-quote-email] Processing quote:", quoteData.quote_number, "to:", quoteData.client_email);

    // ── Auth ──
    const auth = await authenticateRequest(req);
    let isAdmin = false;
    let userId: string | undefined;

    if (auth) {
      userId = auth.user.id;
      isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
      console.log(`[send-quote-email] Authenticated user: ${userId}, isAdmin: ${isAdmin}`);

      if (!isAdmin) {
        let isOwner = false;
        if (quoteData.quote_id) {
          const { data: ownedQuote } = await auth.supabase
            .from("quotes").select("id").eq("id", quoteData.quote_id).maybeSingle();
          isOwner = !!ownedQuote;
        }
        if (!isOwner && quoteData.user_id) {
          isOwner = auth.user.id === quoteData.user_id;
        }
        if (!isOwner) {
          return createAuthErrorResponse("Admin access or quote ownership required", 403, corsHeaders);
        }
      }
    } else {
      if (!quoteData.quote_number || !quoteData.client_email || !quoteData.client_name) {
        return createAuthErrorResponse("Authentication required or complete quote data", 401, corsHeaders);
      }
      console.log("[send-quote-email] No auth token - proceeding with provided data");
    }

    // ── Validate email ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(quoteData.client_email)) {
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Build email ──
    const appUrl = getAppUrl();

    const body = [
      greeting(quoteData.client_name),
      paragraph("Nous avons le plaisir de vous adresser votre devis personnalisé pour la prestation suivante. Nous espérons que cette proposition correspondra à vos attentes."),
      `<div style="text-align:center;margin:15px 0;">
        ${badge(`Devis N° ${quoteData.quote_number}`)}
        &nbsp;${badge("✓ ACTIF", "#6B8E7F")}
      </div>
      <p style="text-align:center;color:#888;font-size:12px;margin:0 0 15px 0;">Ceci est le devis de référence à conserver pour votre dossier.</p>`,
      activityCard({
        title: quoteData.activity_title,
        duration: quoteData.activity_duration,
        startDate: quoteData.start_date,
        endDate: quoteData.end_date,
        participants: quoteData.participants,
      }),
      pricingTable(
        priceRow("Prix unitaire", formatPrice(quoteData.unit_price)) +
        priceRow("Nombre de participants", `${quoteData.participants}`) +
        priceRow("Total", formatPrice(quoteData.total_price), true)
      ),
      infoCard(`
        <p style="margin:0 0 5px 0;color:#8B7D6B;font-size:14px;font-weight:600;">Acompte à verser (${quoteData.deposit_percentage}%)</p>
        <p style="margin:0;color:#8B7D6B;font-size:24px;font-weight:700;font-family:Georgia,serif;">${formatPrice(quoteData.deposit_amount)}</p>
      `),
      quoteData.notes ? `<table role="presentation" style="width:100%;margin:20px 0;">
        <tr><td style="padding:15px;background-color:#FAFAF8;border-radius:8px;">
          <p style="margin:0 0 5px 0;color:#333;font-size:14px;font-weight:600;">Remarques :</p>
          <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">${quoteData.notes}</p>
        </td></tr>
      </table>` : "",
      quoteData.valid_until
        ? `<p style="margin:20px 0 0 0;color:#999;font-size:13px;text-align:center;">Ce devis est valable jusqu'au <strong>${formatDate(quoteData.valid_until)}</strong></p>`
        : "",
    ].join("");

    const emailHtml = wrapInBrandedLayout("Votre devis personnalisé", body, {
      preheader: `Devis ${quoteData.quote_number} – ${quoteData.activity_title}`,
      ctaUrl: `${appUrl}/mon-espace`,
      ctaLabel: "Consulter mon devis",
      footerExtra: `
        <p style="margin:0 0 8px 0;color:#666;font-size:12px;line-height:1.5;">
          <strong>Conditions de réservation :</strong> En acceptant ce devis, vous acceptez nos
          <a href="${appUrl}/cgv" style="color:#6B8E7F;">CGV</a> et nos
          <a href="${appUrl}/cgu" style="color:#6B8E7F;">CGU</a>.
        </p>
        <p style="margin:0;color:#999;font-size:11px;">
          L'acompte de ${quoteData.deposit_percentage}% est requis pour confirmer votre réservation. Le solde devra être réglé avant le départ.
        </p>
      `,
    });

    // ── Send ──
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sender = EMAIL_SENDERS.devis;
    const result = await sendEmailWithAudit({
      supabase: supabaseService,
      to: quoteData.client_email,
      from: `${sender.name} <${sender.email}>`,
      subject: `Votre devis ${quoteData.quote_number} – ${quoteData.activity_title}`,
      html: emailHtml,
      type: "quote",
      userId,
      referenceId: quoteData.quote_id,
    });

    if (!result.success) {
      console.error("[send-quote-email] Send failure:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Échec d'envoi email" }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-quote-email] Email sent successfully to:", quoteData.client_email);

    // Send BCC copies to all admins
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminEmails) {
      if (adminEmail.toLowerCase() === quoteData.client_email.toLowerCase()) continue;
      await sendEmailWithAudit({
        supabase: supabaseService,
        to: adminEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: `[Copie] Devis ${quoteData.quote_number} – ${quoteData.activity_title} → ${quoteData.client_name}`,
        html: emailHtml,
        type: "quote",
        referenceId: quoteData.quote_id,
      });
    }
    console.log(`[send-quote-email] Admin copies sent to ${adminEmails.length} admins`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-quote-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
