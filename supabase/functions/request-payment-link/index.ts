import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { EMAIL_SENDERS, wrapInBrandedLayout, greeting, paragraph, activityCard, pricingTable, priceRow, formatPrice, formatDate, badge, separator, getAppUrl } from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

/**
 * request-payment-link
 * 
 * Called by authenticated CLIENT to request a Stripe payment link for their quote.
 * - Creates a Stripe Checkout session
 * - Sends the payment link to the client by email
 * - Updates quote status to "accepted"
 * - Notifies admins
 */

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Auth check - client must be authenticated
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

    const body = await req.json();
    const { quote_id } = body;

    if (!quote_id) {
      return new Response(JSON.stringify({ error: "quote_id is required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the quote
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the user owns this quote (by email match)
    if (quote.client_email !== user.email) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Stripe setup
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate amount based on payment option
    const paymentOption = quote.payment_option || "deposit";
    const depositPercentage = quote.deposit_percentage || 30;
    const totalPrice = Number(quote.total_price);

    const chargeAmount = paymentOption === "deposit"
      ? Math.ceil(totalPrice * (depositPercentage / 100))
      : totalPrice;

    const paymentType = paymentOption === "deposit" ? "deposit" : "full";
    const amountInCents = Math.round(chargeAmount * 100);

    const description = paymentType === "deposit"
      ? `Acompte ${depositPercentage}% – ${quote.activity_title}`
      : `Paiement intégral – ${quote.activity_title}`;

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: quote.client_email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const appUrl = getAppUrl();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : quote.client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: quote.activity_title,
              description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          quote_id: quote.id,
          payment_type: paymentType,
          client_name: quote.client_name,
          client_email: quote.client_email,
          activity_title: quote.activity_title,
          original_amount: String(totalPrice),
          charge_amount: String(chargeAmount),
          deposit_percentage: String(depositPercentage),
        },
      },
      metadata: {
        quote_id: quote.id,
        payment_type: paymentType,
      },
      success_url: `${appUrl}/paiement-confirme?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/mon-espace`,
    });

    // Update quote: set status to accepted and save stripe session
    await supabase.from("quotes").update({
      status: "accepted",
      stripe_session_id: session.id,
    }).eq("id", quote.id);

    // Send payment link email to client
    const sender = EMAIL_SENDERS.factures;
    const paymentLabel = paymentType === "deposit"
      ? `Acompte de ${depositPercentage}% (${formatPrice(chargeAmount)})`
      : `Paiement intégral (${formatPrice(chargeAmount)})`;

    const emailBody = `
      ${greeting(quote.client_name)}
      ${paragraph(`Suite à votre demande, voici votre lien de paiement sécurisé pour votre réservation :`)}
      
      ${activityCard({ title: quote.activity_title })}

      ${pricingTable(
        priceRow("Prestation", quote.activity_title) +
        (quote.start_date ? priceRow("Date", formatDate(quote.start_date)) : "") +
        priceRow("Participants", String(quote.participants)) +
        priceRow("Montant total", formatPrice(totalPrice)) +
        priceRow("Montant à régler", paymentLabel, true)
      )}

      ${separator()}

      <table role="presentation" style="width:100%;margin:24px 0;">
        <tr><td style="text-align:center;">
          <a href="${session.url}" style="display:inline-block;padding:16px 40px;background-color:#E8652B;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;font-family:Georgia,serif;">
            💳 Payer maintenant – ${formatPrice(chargeAmount)}
          </a>
        </td></tr>
      </table>

      ${paragraph(`Ce lien de paiement est sécurisé par Stripe. Vous serez redirigé vers une page de paiement sécurisée.`)}
      ${paragraph(`Après votre paiement, vous recevrez automatiquement votre confirmation et votre facture par email.`)}
      
      <p style="margin:30px 0 0 0;color:#555;font-size:14px;">Équestrement vôtre,<br><strong style="color:#6B8E7F;">L'équipe An Arwen 🐴</strong></p>
    `;

    const emailHtml = wrapInBrandedLayout(
      "Votre lien de paiement",
      emailBody,
      {
        preheader: `Payez ${formatPrice(chargeAmount)} pour ${quote.activity_title}`,
        ctaUrl: session.url!,
        ctaLabel: "Payer maintenant",
      }
    );

    await sendEmailWithAudit({
      supabase,
      to: quote.client_email,
      from: `${sender.name} <${sender.email}>`,
      subject: `💳 Votre lien de paiement – ${quote.activity_title} – ${formatPrice(chargeAmount)}`,
      html: emailHtml,
      type: "invoice",
      userId: user.id,
      referenceId: quote.id,
    });

    // Notify admins
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    const adminSender = EMAIL_SENDERS.notifications;

    const adminBody = `
      ${greeting("Admin")}
      ${paragraph(`Un client a demandé un lien de paiement pour son devis :`)}
      
      <table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;margin:20px 0;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px 0;"><strong>Client :</strong> ${quote.client_name} (${quote.client_email})</p>
          <p style="margin:0 0 8px 0;"><strong>Devis :</strong> ${quote.quote_number}</p>
          <p style="margin:0 0 8px 0;"><strong>Prestation :</strong> ${quote.activity_title}</p>
          <p style="margin:0 0 8px 0;"><strong>Montant à régler :</strong> ${formatPrice(chargeAmount)} (${paymentType === "deposit" ? `acompte ${depositPercentage}%` : "intégral"})</p>
          <p style="margin:0;"><strong>Montant total :</strong> ${formatPrice(totalPrice)}</p>
        </td></tr>
      </table>
    `;

    const adminHtml = wrapInBrandedLayout("💳 Demande de paiement client", adminBody, {
      preheader: `${quote.client_name} a demandé un lien de paiement pour ${quote.quote_number}`,
      ctaUrl: `${appUrl}/admin`,
      ctaLabel: "Voir dans l'admin",
    });

    for (const adminEmail of adminEmails) {
      await sendEmailWithAudit({
        supabase,
        to: adminEmail,
        from: `${adminSender.name} <${adminSender.email}>`,
        subject: `💳 Demande de paiement – ${quote.client_name} – ${quote.quote_number}`,
        html: adminHtml,
        type: "notification",
        referenceId: quote.id,
      });
    }

    console.log(`[request-payment-link] Payment link sent to ${quote.client_email} for quote ${quote.quote_number}, amount: ${chargeAmount}€`);

    return new Response(JSON.stringify({
      success: true,
      message: "Le lien de paiement a été envoyé à votre adresse email.",
      amount: chargeAmount,
      payment_type: paymentType,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[request-payment-link] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
