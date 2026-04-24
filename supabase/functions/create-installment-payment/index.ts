import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { EMAIL_SENDERS, wrapInBrandedLayout, greeting, paragraph, activityCard, pricingTable, priceRow, formatPrice, formatDate, separator, getAppUrl } from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

/**
 * create-installment-payment
 * 
 * Generates a payment link for a SPECIFIC installment (1/3, 2/3, 3/3) of a 3x payment plan.
 * Strong safeguards:
 *  - Refuse if installment already paid
 *  - Refuse if sum of installments would exceed quote total
 *  - Auto-create the payment_schedules row if not exists
 *  - Idempotent: re-sending link for same installment updates existing schedule
 */

interface RequestBody {
  quote_id: string;
  installment_number: number; // 1, 2, or 3
  total_installments?: number; // default 3
  due_date?: string; // ISO date string
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Auth check - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: RequestBody = await req.json();
    const { quote_id, installment_number, total_installments = 3, due_date } = body;

    // === VALIDATION INPUTS ===
    if (!quote_id || !installment_number) {
      return new Response(JSON.stringify({ error: "quote_id et installment_number requis" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!Number.isInteger(installment_number) || installment_number < 1 || installment_number > total_installments) {
      return new Response(JSON.stringify({ error: `Le numéro de versement doit être un entier entre 1 et ${total_installments}` }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!Number.isInteger(total_installments) || total_installments < 2 || total_installments > 12) {
      return new Response(JSON.stringify({ error: "total_installments doit être un entier entre 2 et 12" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // SECURITY: reject any attempt to inject a custom amount in the body
    if ("custom_amount" in (body as Record<string, unknown>)) {
      return new Response(JSON.stringify({ 
        error: "Le montant des versements est calculé automatiquement (33,33%) et ne peut pas être modifié manuellement." 
      }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // === FETCH QUOTE ===
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: "Devis introuvable" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const totalPrice = Number(quote.total_price);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return new Response(JSON.stringify({ error: "Le devis n'a pas de montant total valide" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // === COMPUTE EXPECTED INSTALLMENT AMOUNT (33,33% / 33,33% / 33,34%) ===
    // SECURITY: this amount is the ONLY source of truth — no client override allowed
    const baseInstallment = Math.floor((totalPrice / total_installments) * 100) / 100;
    const installmentAmount = installment_number === total_installments
      ? Math.round((totalPrice - baseInstallment * (total_installments - 1)) * 100) / 100
      : baseInstallment;

    // === SAFEGUARD 1: Check existing schedules for this quote ===
    const { data: existingSchedules } = await supabase
      .from("payment_schedules")
      .select("*")
      .eq("quote_id", quote_id)
      .neq("status", "cancelled");

    const existingForThisInstallment = existingSchedules?.find(
      (s) => s.installment_number === installment_number
    );

    // Block if already PAID
    if (existingForThisInstallment?.status === "paid") {
      return new Response(JSON.stringify({ 
        error: `Le versement ${installment_number}/${total_installments} a déjà été payé le ${new Date(existingForThisInstallment.paid_at).toLocaleDateString("fr-FR")}.` 
      }), {
        status: 409, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // === SAFEGUARD 2: Sum of active installments must not exceed total ===
    const sumOthers = (existingSchedules || [])
      .filter((s) => s.installment_number !== installment_number)
      .reduce((sum, s) => sum + Number(s.expected_amount), 0);

    const projectedTotal = sumOthers + installmentAmount;
    if (projectedTotal > totalPrice + 1) {
      return new Response(JSON.stringify({ 
        error: `Erreur: la somme des versements (${projectedTotal.toFixed(2)}€) dépasserait le total du devis (${totalPrice}€). Vérifiez l'échéancier existant.` 
      }), {
        status: 409, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // === STRIPE SETUP ===
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe non configuré" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: quote.client_email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const appUrl = getAppUrl();
    const installmentLabel = `Versement ${installment_number}/${total_installments}`;
    const description = `${installmentLabel} – ${quote.activity_title}`;

    // === CREATE STRIPE SESSION ===
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : quote.client_email,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: quote.activity_title,
            description,
          },
          unit_amount: Math.round(installmentAmount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          quote_id: quote.id,
          payment_type: "installment",
          installment_number: String(installment_number),
          total_installments: String(total_installments),
          client_name: quote.client_name,
          client_email: quote.client_email,
          activity_title: quote.activity_title,
          original_amount: String(totalPrice),
          charge_amount: String(installmentAmount),
        },
      },
      metadata: {
        quote_id: quote.id,
        payment_type: "installment",
        installment_number: String(installment_number),
        total_installments: String(total_installments),
      },
      success_url: `${appUrl}/paiement-confirme?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/mon-espace`,
    });

    // === UPSERT payment_schedules ===
    if (existingForThisInstallment) {
      await supabase
        .from("payment_schedules")
        .update({
          expected_amount: installmentAmount,
          percentage: Math.round((installmentAmount / totalPrice) * 10000) / 100,
          status: "link_sent",
          link_sent_at: new Date().toISOString(),
          stripe_session_id: session.id,
          payment_link_url: session.url,
          due_date: due_date || existingForThisInstallment.due_date,
        })
        .eq("id", existingForThisInstallment.id);
    } else {
      await supabase.from("payment_schedules").insert({
        quote_id: quote.id,
        installment_number,
        total_installments,
        expected_amount: installmentAmount,
        percentage: Math.round((installmentAmount / totalPrice) * 10000) / 100,
        status: "link_sent",
        link_sent_at: new Date().toISOString(),
        stripe_session_id: session.id,
        payment_link_url: session.url,
        due_date,
        created_by: user.id,
      });
    }

    // Update quote payment_option to installments if not already
    if (quote.payment_option !== "installments") {
      await supabase
        .from("quotes")
        .update({ payment_option: "installments" })
        .eq("id", quote.id);
    }

    // === SEND EMAIL TO CLIENT ===
    const sender = EMAIL_SENDERS.factures;

    const emailBody = `
      ${greeting(quote.client_name)}
      ${paragraph(`Voici votre lien de paiement sécurisé pour le <strong>${installmentLabel}</strong> de votre paiement en ${total_installments} fois :`)}
      
      ${activityCard({ title: quote.activity_title })}

      ${pricingTable(
        priceRow("Prestation", quote.activity_title) +
        (quote.start_date ? priceRow("Date du séjour", formatDate(quote.start_date)) : "") +
        priceRow("Participants", String(quote.participants)) +
        priceRow("Montant total du séjour", formatPrice(totalPrice)) +
        priceRow(`Versement ${installment_number} sur ${total_installments}`, formatPrice(installmentAmount), true)
      )}

      ${separator()}

      <table role="presentation" style="width:100%;margin:24px 0;">
        <tr><td style="text-align:center;">
          <a href="${session.url}" style="display:inline-block;padding:16px 40px;background-color:#E8652B;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;font-family:Georgia,serif;">
            💳 Régler le versement ${installment_number}/${total_installments} – ${formatPrice(installmentAmount)}
          </a>
        </td></tr>
      </table>

      ${paragraph(`Ce lien correspond uniquement au <strong>versement ${installment_number} sur ${total_installments}</strong> de votre plan de paiement échelonné.`)}
      ${due_date ? paragraph(`<strong>Date limite de règlement :</strong> ${formatDate(due_date)}`) : ""}
      ${paragraph(`Paiement sécurisé via Stripe. Vous recevrez automatiquement votre confirmation par email.`)}
      
      <p style="margin:30px 0 0 0;color:#555;font-size:14px;">Équestrement vôtre,<br><strong style="color:#6B8E7F;">L'équipe An Arwen 🐴</strong></p>
    `;

    const emailHtml = wrapInBrandedLayout(
      `Versement ${installment_number}/${total_installments}`,
      emailBody,
      {
        preheader: `${installmentLabel} – ${formatPrice(installmentAmount)} pour ${quote.activity_title}`,
        ctaUrl: session.url!,
        ctaLabel: `Payer le versement ${installment_number}/${total_installments}`,
      }
    );

    await sendEmailWithAudit({
      supabase,
      to: quote.client_email,
      from: `${sender.name} <${sender.email}>`,
      subject: `💳 Versement ${installment_number}/${total_installments} – ${quote.activity_title} – ${formatPrice(installmentAmount)}`,
      html: emailHtml,
      type: "invoice",
      referenceId: quote.id,
    });

    console.log(`[create-installment-payment] Sent installment ${installment_number}/${total_installments} link to ${quote.client_email} for ${installmentAmount}€`);

    return new Response(JSON.stringify({
      success: true,
      message: `Lien de paiement (versement ${installment_number}/${total_installments}) envoyé à ${quote.client_email}`,
      url: session.url,
      amount: installmentAmount,
      installment_number,
      total_installments,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-installment-payment] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
