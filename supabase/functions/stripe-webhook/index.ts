import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SENDERS, wrapInBrandedLayout, greeting, paragraph, activityCard, pricingTable, priceRow, formatPrice, formatDate, badge, separator, getAppUrl } from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

/**
 * stripe-webhook
 * 
 * Handles Stripe webhook events:
 * - checkout.session.completed → payment confirmed
 *   → Updates invoice/quote status
 *   → Sends payment receipt + invoice to client
 *   → Notifies admins
 */

serve(async (req: Request) => {
  // Webhooks don't need CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400 });
      }
      const body = await req.text();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Without webhook secret, parse directly (test mode)
      const body = await req.json();
      event = body as Stripe.Event;
      console.warn("[stripe-webhook] Running WITHOUT webhook signature verification (test mode)");
    }
  } catch (err: any) {
    console.error("[stripe-webhook] Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const invoiceId = metadata.invoice_id || null;
    const quoteId = metadata.quote_id || null;
    const paymentType = metadata.payment_type || "full";
    
    // Get payment intent details
    let paymentIntent: Stripe.PaymentIntent | null = null;
    if (session.payment_intent && typeof session.payment_intent === "string") {
      paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
    }

    const piMetadata = paymentIntent?.metadata || metadata;
    const clientName = piMetadata.client_name || session.customer_details?.name || "Client";
    const clientEmail = piMetadata.client_email || session.customer_details?.email || "";
    const activityTitle = piMetadata.activity_title || "Prestation";
    const chargeAmount = Number(piMetadata.charge_amount || 0) || (session.amount_total ? session.amount_total / 100 : 0);
    const originalAmount = Number(piMetadata.original_amount || chargeAmount);

    console.log(`[stripe-webhook] Payment completed: ${clientEmail}, ${chargeAmount}€, type: ${paymentType}`);

    // 1. Record payment in payments table
    await supabase.from("payments").insert({
      invoice_id: invoiceId || null,
      quote_id: quoteId || null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount: chargeAmount,
      currency: session.currency || "eur",
      payment_type: paymentType,
      status: "completed",
      client_name: clientName,
      client_email: clientEmail,
      metadata: { activity_title: activityTitle, original_amount: originalAmount },
    });

    // 2. Update invoice status
    if (invoiceId) {
      const newPaymentStatus = paymentType === "deposit" ? "partial" : "paid";
      await supabase.from("invoices").update({
        payment_status: newPaymentStatus,
        amount_paid: chargeAmount,
        payment_date: new Date().toISOString(),
        payment_method: "stripe",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: newPaymentStatus === "paid" ? "paid" : "sent",
      }).eq("id", invoiceId);
    }

    // 3. Update quote status
    if (quoteId) {
      await supabase.from("quotes").update({
        status: "accepted",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      }).eq("id", quoteId);
    }

    // 4. Send payment receipt to client
    const appUrl = getAppUrl();
    const sender = EMAIL_SENDERS.factures;

    const paymentLabel = paymentType === "deposit"
      ? `Acompte (${piMetadata.deposit_percentage || 30}%)`
      : "Paiement intégral";

    const receiptBody = `
      ${greeting(clientName)}
      ${paragraph(`Nous avons bien reçu votre paiement et nous vous en remercions. Voici le récapitulatif de votre transaction :`)}
      
      ${activityCard({ title: activityTitle })}

      <table role="presentation" style="width:100%;background-color:#E8F5E9;border-radius:12px;margin:20px 0;border-left:4px solid #4CAF50;">
        <tr><td style="padding:20px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:14px;color:#2E7D32;font-weight:600;">✅ Paiement confirmé</p>
          <p style="margin:0;font-size:24px;color:#1B5E20;font-weight:700;font-family:Georgia,serif;">${formatPrice(chargeAmount)}</p>
          <p style="margin:8px 0 0 0;font-size:13px;color:#388E3C;">${paymentLabel}</p>
        </td></tr>
      </table>

      ${pricingTable(
        priceRow("Type de paiement", paymentLabel) +
        priceRow("Montant réglé", formatPrice(chargeAmount), true) +
        (paymentType === "deposit" ? priceRow("Montant total de la prestation", formatPrice(originalAmount)) : "") +
        (paymentType === "deposit" ? priceRow("Reste à payer", formatPrice(originalAmount - chargeAmount)) : "")
      )}

      ${separator()}
      ${paragraph(`Un email de confirmation détaillé vous sera envoyé prochainement avec toutes les informations pratiques pour votre séjour.`)}
      ${paragraph(`Pour toute question, n'hésitez pas à nous contacter.`)}
      <p style="margin:30px 0 0 0;color:#555;font-size:14px;">Équestrement vôtre,<br><strong style="color:#6B8E7F;">L'équipe An Arwen 🐴</strong></p>
    `;

    const receiptHtml = wrapInBrandedLayout(
      "Confirmation de paiement",
      receiptBody,
      {
        preheader: `Paiement de ${formatPrice(chargeAmount)} confirmé – ${activityTitle}`,
        ctaUrl: `${appUrl}/mon-espace`,
        ctaLabel: "Accéder à mon Espace",
      }
    );

    await sendEmailWithAudit({
      supabase,
      to: clientEmail,
      from: `${sender.name} <${sender.email}>`,
      subject: `✅ Paiement confirmé – ${formatPrice(chargeAmount)} – ${activityTitle}`,
      html: receiptHtml,
      type: "notification",
      referenceId: invoiceId || quoteId || undefined,
    });

    // 5. Notify admins
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    const adminSender = EMAIL_SENDERS.notifications;

    const adminBody = `
      ${greeting("Admin")}
      ${paragraph(`Un paiement Stripe a été reçu avec succès :`)}
      
      <table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;margin:20px 0;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px 0;"><strong>Client :</strong> ${clientName} (${clientEmail})</p>
          <p style="margin:0 0 8px 0;"><strong>Prestation :</strong> ${activityTitle}</p>
          <p style="margin:0 0 8px 0;"><strong>Montant :</strong> ${formatPrice(chargeAmount)} (${paymentLabel})</p>
          ${paymentType === "deposit" ? `<p style="margin:0 0 8px 0;"><strong>Total prestation :</strong> ${formatPrice(originalAmount)}</p>` : ""}
          <p style="margin:0;"><strong>Référence Stripe :</strong> ${session.id}</p>
        </td></tr>
      </table>
    `;

    const adminHtml = wrapInBrandedLayout("💰 Paiement reçu", adminBody, {
      preheader: `${formatPrice(chargeAmount)} reçu de ${clientName}`,
      ctaUrl: `${appUrl}/admin`,
      ctaLabel: "Voir dans l'admin",
    });

    for (const adminEmail of adminEmails) {
      await sendEmailWithAudit({
        supabase,
        to: adminEmail,
        from: `${adminSender.name} <${adminSender.email}>`,
        subject: `💰 Paiement reçu : ${formatPrice(chargeAmount)} – ${clientName} – ${activityTitle}`,
        html: adminHtml,
        type: "notification",
        referenceId: invoiceId || quoteId || undefined,
      });
    }

    console.log(`[stripe-webhook] Payment processed successfully. Receipt sent to ${clientEmail}, ${adminEmails.length} admins notified.`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
