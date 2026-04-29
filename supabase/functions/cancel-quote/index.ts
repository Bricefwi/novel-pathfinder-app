import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, separator, badge,
} from "../_shared/email-templates.ts";

interface CancelQuoteRequest {
  quote_id: string;
  reason?: string;
  send_email?: boolean;
  custom_message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return handleCorsPreflightRequest(origin);

  try {
    const auth = await authenticateRequest(req);
    if (!auth) return createAuthErrorResponse("Authentication required", 401, corsHeaders);

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) return createAuthErrorResponse("Admin access required", 403, corsHeaders);

    const { quote_id, reason, send_email = true, custom_message } = (await req.json()) as CancelQuoteRequest;

    if (!quote_id) {
      return new Response(JSON.stringify({ error: "quote_id requis" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer le devis
    const { data: quote, error: quoteErr } = await supabaseService
      .from("quotes")
      .select("*")
      .eq("id", quote_id)
      .maybeSingle();

    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: "Devis introuvable" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (quote.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Ce devis est déjà annulé" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (["paid", "partial"].includes(quote.status)) {
      return new Response(JSON.stringify({
        error: "Impossible d'annuler un devis déjà payé (totalement ou partiellement). Utilisez plutôt un remboursement.",
      }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Marquer comme annulé
    const { error: updateErr } = await supabaseService
      .from("quotes")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: auth.user.id,
        cancellation_reason: reason || null,
        validation_notification_sent: true, // bloque toute relance
      })
      .eq("id", quote_id);

    if (updateErr) {
      console.error("[cancel-quote] Update error:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Annuler les éventuelles échéances de paiement non payées + tracer le motif dans les notes
    const cancellationNote = `Annulé suite à l'annulation du devis ${quote.quote_number} le ${new Date().toLocaleDateString("fr-FR")}. Motif : ${reason || "non précisé"}`;
    const { data: cancelledSchedules } = await supabaseService
      .from("payment_schedules")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        notes: cancellationNote,
      })
      .eq("quote_id", quote_id)
      .in("status", ["pending", "sent"])
      .select("id, installment_number");

    // Audit : tracer chaque relance désormais bloquée pour ce devis
    if (cancelledSchedules && cancelledSchedules.length > 0) {
      const auditRows = cancelledSchedules.map((s) => ({
        type: "reminder_blocked",
        recipient: quote.client_email,
        subject: `[BLOCK] Relances futures stoppées — versement ${s.installment_number} du devis ${quote.quote_number}`,
        status: "blocked",
        error_message: `Devis annulé par ${auth.user.email}. Motif : ${reason || "non précisé"}`,
        reference_id: s.id,
      }));
      await supabaseService.from("email_audit_log").insert(auditRows);
    }

    // Envoyer email d'excuse au client
    let emailResult: { success: boolean; error?: string } = { success: true };
    if (send_email) {
      const appUrl = getAppUrl();
      const firstName = quote.client_name?.split(" ")[0] || "Cher client";
      const defaultMessage = `Nous vous écrivons concernant votre devis <strong>${quote.quote_number}</strong> pour <strong>${quote.activity_title}</strong>.`;

      const explanation = reason
        ? `<p style="margin:15px 0;color:#333;font-size:15px;line-height:1.6;">
            <strong>Motif :</strong> ${reason.replace(/\n/g, "<br/>")}
          </p>`
        : "";

      const customBlock = custom_message
        ? paragraph(custom_message.replace(/\n/g, "<br/>"))
        : paragraph(
            `Ce devis a été <strong>annulé</strong> et n'est plus valable. Si vous receviez encore des relances pour ce devis, vous pouvez les ignorer.`
          );

      const statusBanner = `<div style="text-align:center;margin:0 0 20px 0;">
        ${badge(`❌ DEVIS ${quote.quote_number} — ANNULÉ`, "#B85450")}
      </div>`;

      const bodyContent = [
        statusBanner,
        greeting(firstName),
        paragraph(defaultMessage),
        explanation,
        customBlock,
        separator(),
        paragraph(
          `Si cette annulation vous semble être une erreur, ou si vous souhaitez établir un nouveau devis, n'hésitez pas à nous contacter directement au <strong>06 59 22 62 70</strong> ou par email.`
        ),
        `<p style="margin:20px 0 0 0;color:#333;font-size:15px;line-height:1.6;">
          Avec toute notre attention,<br/>
          <strong>L'équipe An Arwen</strong> 🌿
        </p>`,
      ].join("");

      const html = wrapInBrandedLayout(`Annulation du devis ${quote.quote_number}`, bodyContent, {
        preheader: `Votre devis ${quote.quote_number} a été annulé`,
        ctaUrl: `${appUrl}/contact`,
        ctaLabel: "Nous contacter",
      });

      const sender = EMAIL_SENDERS.devis;
      emailResult = await sendEmailWithAudit({
        supabase: supabaseService,
        to: quote.client_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `Annulation de votre devis ${quote.quote_number} – An Arwen`,
        html,
        type: "notification",
        userId: auth.user.id,
        referenceId: quote_id,
      });

      if (emailResult.success) {
        await supabaseService
          .from("quotes")
          .update({ cancellation_email_sent: true })
          .eq("id", quote_id);
      }
    }

    // Log
    await supabaseService.from("quote_cancellation_log").insert({
      quote_id,
      quote_number: quote.quote_number,
      client_email: quote.client_email,
      client_name: quote.client_name,
      reason: reason || null,
      cancelled_by: auth.user.id,
      cancelled_by_email: auth.user.email,
      email_sent: send_email && emailResult.success,
      email_error: emailResult.success ? null : emailResult.error,
      metadata: {
        previous_status: quote.status,
        activity_title: quote.activity_title,
        total_price: quote.total_price,
        custom_message_used: !!custom_message,
      },
    });

    console.log(`[cancel-quote] Quote ${quote.quote_number} cancelled by ${auth.user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: send_email && emailResult.success,
        email_error: emailResult.success ? null : emailResult.error,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[cancel-quote] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
