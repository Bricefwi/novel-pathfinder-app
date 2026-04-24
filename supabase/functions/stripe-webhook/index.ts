import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SENDERS, wrapInBrandedLayout, greeting, paragraph, activityCard, pricingTable, priceRow, formatPrice, formatDate, badge, separator, infoCard, getAppUrl } from "../_shared/email-templates.ts";
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

    // 1.b. If installment payment, mark the corresponding payment_schedule as paid
    if (paymentType === "installment" && quoteId) {
      const installmentNumber = Number(piMetadata.installment_number || metadata.installment_number || 0);
      if (installmentNumber > 0) {
        const { error: schedErr } = await supabase
          .from("payment_schedules")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          })
          .eq("quote_id", quoteId)
          .eq("installment_number", installmentNumber)
          .neq("status", "cancelled");
        if (schedErr) {
          console.error(`[stripe-webhook] Failed to update payment_schedule ${installmentNumber}:`, schedErr.message);
        } else {
          console.log(`[stripe-webhook] Payment schedule installment ${installmentNumber} marked as paid for quote ${quoteId}`);
        }
      }
    }

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

    // 3. Update quote status + auto-generate invoice
    let generatedInvoiceId: string | null = null;
    if (quoteId) {
      await supabase.from("quotes").update({
        status: "accepted",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      }).eq("id", quoteId);

      // Auto-generate invoice from quote if no invoice exists yet
      if (!invoiceId) {
        const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
        if (quote) {
          // Generate invoice number
          const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
          const now = new Date().toISOString();
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          const newInvoice = {
            invoice_number: invoiceNumber || `FAC-${Date.now()}`,
            quote_id: quoteId,
            user_id: quote.user_id,
            client_name: quote.client_name,
            client_email: quote.client_email,
            client_phone: quote.client_phone,
            client_address: quote.client_address,
            activity_title: quote.activity_title,
            activity_duration: quote.activity_duration,
            start_date: quote.start_date,
            end_date: quote.end_date,
            unit_price: quote.unit_price,
            participants: quote.participants,
            subtotal: quote.total_price,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: quote.total_price,
            amount_paid: chargeAmount,
            payment_status: paymentType === "deposit" ? "partial" : "paid",
            payment_method: "stripe",
            payment_date: now,
            due_date: dueDate.toISOString().split("T")[0],
            status: paymentType === "deposit" ? "sent" : "paid",
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            stripe_session_id: session.id,
            cgu_accepted: quote.cgu_accepted || false,
            cgu_accepted_at: quote.cgu_accepted_at,
            cgv_accepted: quote.cgv_accepted || false,
            cgv_accepted_at: quote.cgv_accepted_at,
            notes: `Facture générée automatiquement suite au paiement Stripe du devis ${quote.quote_number}.`,
          };

          const { data: createdInvoice, error: invErr } = await supabase.from("invoices").insert(newInvoice).select("id").single();
          if (invErr) {
            console.error("[stripe-webhook] Failed to create invoice:", invErr.message);
          } else {
            generatedInvoiceId = createdInvoice.id;
            console.log(`[stripe-webhook] Invoice ${invoiceNumber} created from quote ${quote.quote_number}`);

            // Update payment record with invoice reference
            await supabase.from("payments").update({ invoice_id: generatedInvoiceId })
              .eq("stripe_session_id", session.id);
          }
        }
      }
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
      referenceId: invoiceId || generatedInvoiceId || quoteId || undefined,
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

    // 6. Auto-send invoice email if invoice was created or already existed
    const finalInvoiceId = invoiceId || generatedInvoiceId;
    if (finalInvoiceId) {
      const { data: invoiceForEmail } = await supabase.from("invoices").select("*").eq("id", finalInvoiceId).single();
      if (invoiceForEmail) {
        const COMPANY_LEGAL = "Ferme Équestre An Arwen – SIRET 80266354200016 – Non assujetti à la TVA, art. 293 B du CGI";
        const isPaid = invoiceForEmail.payment_status === "paid";
        const hasPartialPayment = invoiceForEmail.amount_paid && invoiceForEmail.amount_paid > 0 && invoiceForEmail.amount_paid < invoiceForEmail.total_amount;

        const paymentStatusHtml = isPaid
          ? infoCard(`<p style="margin:0;color:#2E7D32;font-size:15px;font-weight:600;">✅ Facture acquittée</p>`, "#4CAF50")
          : infoCard(`
              <p style="margin:0 0 5px 0;color:#8B7D6B;font-size:14px;font-weight:600;">⏳ En attente de solde</p>
              ${hasPartialPayment ? `
                <p style="margin:5px 0 0 0;color:#8B7D6B;font-size:14px;">Acompte versé : ${formatPrice(invoiceForEmail.amount_paid)}</p>
                <p style="margin:5px 0 0 0;color:#8B7D6B;font-size:16px;font-weight:600;">Reste à payer : ${formatPrice(invoiceForEmail.total_amount - invoiceForEmail.amount_paid)}</p>
              ` : ""}
            `);

        const taxRows = invoiceForEmail.tax_amount > 0
          ? priceRow(`TVA (${invoiceForEmail.tax_rate || 20}%)`, formatPrice(invoiceForEmail.tax_amount))
          : "";

        const invoiceBody = [
          greeting(invoiceForEmail.client_name),
          paragraph("Suite à votre paiement, veuillez trouver ci-dessous votre facture officielle. Ce document fait foi pour votre comptabilité."),
          `<div style="text-align:center;margin:15px 0;">${badge(`Facture N° ${invoiceForEmail.invoice_number}`)}</div>`,
          activityCard({
            title: invoiceForEmail.activity_title,
            duration: invoiceForEmail.activity_duration,
            startDate: invoiceForEmail.start_date,
            endDate: invoiceForEmail.end_date,
            participants: invoiceForEmail.participants,
          }),
          pricingTable(
            priceRow("Prix unitaire", formatPrice(invoiceForEmail.unit_price)) +
            priceRow(`${invoiceForEmail.participants} participant(s)`, `× ${invoiceForEmail.participants}`) +
            priceRow("Sous-total HT", formatPrice(invoiceForEmail.subtotal)) +
            taxRows +
            priceRow("Total TTC", formatPrice(invoiceForEmail.total_amount), true)
          ),
          paymentStatusHtml,
          separator(),
          paragraph(`<strong>Rappel CGU/CGV :</strong> En procédant au paiement, vous confirmez avoir lu et accepté nos <a href="${appUrl}/cgu" style="color:#6B8E7F;">Conditions Générales d'Utilisation</a> et nos <a href="${appUrl}/cgv" style="color:#6B8E7F;">Conditions Générales de Vente</a>.`),
          invoiceForEmail.cgu_accepted ? paragraph(`✅ CGU acceptées le ${formatDate(invoiceForEmail.cgu_accepted_at)}`) : "",
          invoiceForEmail.cgv_accepted ? paragraph(`✅ CGV acceptées le ${formatDate(invoiceForEmail.cgv_accepted_at)}`) : "",
        ].join("");

        const invoiceHtml = wrapInBrandedLayout("Votre facture", invoiceBody, {
          preheader: `Facture ${invoiceForEmail.invoice_number} – ${invoiceForEmail.activity_title}`,
          ctaUrl: `${appUrl}/mon-espace`,
          ctaLabel: "Consulter mes documents",
          footerExtra: `
            <p style="margin:0 0 8px 0;color:#666;font-size:12px;line-height:1.5;">
              <strong>Mentions légales :</strong> ${COMPANY_LEGAL}
            </p>
            <p style="margin:0;color:#888;font-size:11px;line-height:1.5;">
              <strong>Conditions de paiement :</strong> Paiement à réception. En cas de retard, pénalité de 3× le taux d'intérêt légal + indemnité forfaitaire de 40 € pour frais de recouvrement (art. L.441-10 et D.441-5 du Code de commerce).
            </p>
          `,
        });

        const invSender = EMAIL_SENDERS.factures;
        await sendEmailWithAudit({
          supabase,
          to: invoiceForEmail.client_email,
          from: `${invSender.name} <${invSender.email}>`,
          subject: `📄 Facture ${invoiceForEmail.invoice_number} – ${invoiceForEmail.activity_title}`,
          html: invoiceHtml,
          type: "invoice",
          userId: invoiceForEmail.user_id,
          referenceId: finalInvoiceId,
        });

        // Send admin copies
        for (const adminEmail of adminEmails) {
          if (adminEmail.toLowerCase() === invoiceForEmail.client_email.toLowerCase()) continue;
          await sendEmailWithAudit({
            supabase,
            to: adminEmail,
            from: `${invSender.name} <${invSender.email}>`,
            subject: `[Copie] Facture ${invoiceForEmail.invoice_number} – ${invoiceForEmail.client_name}`,
            html: invoiceHtml,
            type: "invoice",
            referenceId: finalInvoiceId,
          });
        }

        console.log(`[stripe-webhook] Invoice email sent to ${invoiceForEmail.client_email}`);
      }
    }

    console.log(`[stripe-webhook] Payment processed successfully. Receipt sent to ${clientEmail}, ${adminEmails.length} admins notified.`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
