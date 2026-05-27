import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { EMAIL_SENDERS, wrapInBrandedLayout, greeting, paragraph, activityCard, pricingTable, priceRow, formatPrice, formatDate, separator, getAppUrl } from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

/**
 * create-checkout-session
 * 
 * Called by admin to generate a Stripe Checkout payment link for a quote or invoice.
 * Supports: full payment or deposit (acompte).
 * Creates the Stripe session AND sends the payment link email to the client.
 */

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

    const body = await req.json();
    const {
      invoice_id,
      quote_id,
      client_name,
      client_email,
      activity_title,
      amount, // in EUR (e.g. 450.00)
      payment_type = "full", // "full" or "deposit"
      deposit_percentage,
    } = body;

    if (!client_email || !activity_title || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields: client_email, activity_title, amount" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let quoteForLegalCheck: any = null;
    let invoiceForLegalCheck: any = null;

    if (quote_id) {
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("id, quote_number, cgu_accepted, cgv_accepted")
        .eq("id", quote_id)
        .single();
      if (quoteError || !quote) {
        return new Response(JSON.stringify({ error: "Devis introuvable" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      quoteForLegalCheck = quote;
    }

    if (invoice_id) {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, quote_id, cgu_accepted, cgv_accepted")
        .eq("id", invoice_id)
        .single();
      if (invoiceError || !invoice) {
        return new Response(JSON.stringify({ error: "Facture introuvable" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      invoiceForLegalCheck = invoice;

      if (invoice.quote_id && !quoteForLegalCheck) {
        const { data: linkedQuote } = await supabase
          .from("quotes")
          .select("id, quote_number, cgu_accepted, cgv_accepted")
          .eq("id", invoice.quote_id)
          .maybeSingle();
        quoteForLegalCheck = linkedQuote;
      }
    }

    const hasLegalAcceptance = Boolean(
      (quoteForLegalCheck?.cgu_accepted && quoteForLegalCheck?.cgv_accepted) ||
      (invoiceForLegalCheck?.cgu_accepted && invoiceForLegalCheck?.cgv_accepted)
    );

    if (!hasLegalAcceptance) {
      return new Response(JSON.stringify({
        error: "Impossible d'envoyer un lien de paiement : le client doit d'abord valider le devis et accepter les CGU/CGV dans son espace.",
        code: "CGV_REQUIRED",
      }), {
        status: 412, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate actual amount to charge
    // payment_type values: "full" | "deposit" | "balance" (solde restant dû)
    const chargeAmount = payment_type === "deposit" && deposit_percentage
      ? Math.ceil(amount * (deposit_percentage / 100))
      : amount;

    const amountInCents = Math.round(chargeAmount * 100);

    // Build description
    const description = payment_type === "deposit"
      ? `Acompte ${deposit_percentage}% – ${activity_title}`
      : payment_type === "balance"
      ? `Solde restant dû – ${activity_title}`
      : `Paiement intégral – ${activity_title}`;

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: client_email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build app URL for redirects
    const appUrl = getAppUrl();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: activity_title,
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
          invoice_id: invoice_id || "",
          quote_id: quote_id || "",
          payment_type,
          client_name: client_name || "",
          client_email,
          activity_title,
          original_amount: String(amount),
          charge_amount: String(chargeAmount),
        },
      },
      metadata: {
        invoice_id: invoice_id || "",
        quote_id: quote_id || "",
        payment_type,
      },
      success_url: `${appUrl}/paiement-confirme?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/paiement-annule`,
    });

    // Save session ID to invoice/quote
    if (invoice_id) {
      await supabase.from("invoices").update({ stripe_session_id: session.id }).eq("id", invoice_id);
    }
    if (quote_id) {
      await supabase.from("quotes").update({ stripe_session_id: session.id }).eq("id", quote_id);
    }

    // ===== SEND PAYMENT LINK EMAIL TO CLIENT =====
    const sender = EMAIL_SENDERS.factures;
    const paymentLabel = payment_type === "deposit"
      ? `Acompte de ${deposit_percentage}% (${formatPrice(chargeAmount)})`
      : payment_type === "balance"
      ? `Solde restant dû (${formatPrice(chargeAmount)})`
      : `Paiement intégral (${formatPrice(chargeAmount)})`;

    const emailBody = `
      ${greeting(client_name || "Client")}
      ${paragraph(`Voici votre lien de paiement sécurisé pour votre réservation :`)}
      
      ${activityCard({ title: activity_title })}

      ${pricingTable(
        priceRow("Prestation", activity_title) +
        priceRow("Montant total", formatPrice(amount)) +
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
        preheader: `Payez ${formatPrice(chargeAmount)} pour ${activity_title}`,
        ctaUrl: session.url!,
        ctaLabel: "Payer maintenant",
      }
    );

    // Send to client
    const emailResult = await sendEmailWithAudit({
      supabase,
      to: client_email,
      from: `${sender.name} <${sender.email}>`,
      subject: `💳 Votre lien de paiement – ${activity_title} – ${formatPrice(chargeAmount)}`,
      html: emailHtml,
      type: "invoice",
      userId: user.id,
      referenceId: quote_id || invoice_id || undefined,
    });

    // Notify admins
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    const adminSender = EMAIL_SENDERS.notifications;
    const docType = quote_id ? "Devis" : "Facture";
    const docId = quote_id || invoice_id || "N/A";

    const adminBody = `
      ${greeting("Admin")}
      ${paragraph(`Un lien de paiement Stripe a été envoyé à un client :`)}
      
      <table role="presentation" style="width:100%;background-color:#F5F3F0;border-radius:12px;margin:20px 0;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px 0;"><strong>Client :</strong> ${client_name || "N/A"} (${client_email})</p>
          <p style="margin:0 0 8px 0;"><strong>${docType} :</strong> ${docId}</p>
          <p style="margin:0 0 8px 0;"><strong>Prestation :</strong> ${activity_title}</p>
          <p style="margin:0 0 8px 0;"><strong>Montant à régler :</strong> ${formatPrice(chargeAmount)} (${payment_type === "deposit" ? `acompte ${deposit_percentage}%` : "intégral"})</p>
          <p style="margin:0;"><strong>Montant total :</strong> ${formatPrice(amount)}</p>
        </td></tr>
      </table>
    `;

    const adminHtml = wrapInBrandedLayout("💳 Lien de paiement envoyé", adminBody, {
      preheader: `Lien de paiement envoyé à ${client_name} pour ${activity_title}`,
      ctaUrl: `${appUrl}/admin`,
      ctaLabel: "Voir dans l'admin",
    });

    for (const adminEmail of adminEmails) {
      await sendEmailWithAudit({
        supabase,
        to: adminEmail,
        from: `${adminSender.name} <${adminSender.email}>`,
        subject: `💳 Lien de paiement envoyé – ${client_name} – ${activity_title}`,
        html: adminHtml,
        type: "notification",
        referenceId: quote_id || invoice_id || undefined,
      });
    }

    console.log(`[create-checkout-session] Session created & email sent: ${session.id} for ${client_email}, amount: ${chargeAmount}€ (${payment_type}), email: ${emailResult.success ? "OK" : "FAILED"}`);

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
      amount: chargeAmount,
      payment_type,
      email_sent: emailResult.success,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[create-checkout-session] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
