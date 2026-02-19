import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  formatDate, formatPrice, paragraph, separator, greeting,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * rappel-paiement — Multi-stage payment reminders
 * 
 * Sends automated reminders at J-14, J-7, J-3, J-1 before the due date
 * for invoices with remaining balance (especially after deposit payments).
 * 
 * Each stage has a unique subject tag to prevent duplicates via email_audit_log.
 */

interface ReminderStage {
  daysBeforeDue: number;
  tag: string;
  urgency: "info" | "warning" | "urgent" | "critical";
  emoji: string;
  label: string;
  color: string;
  borderColor: string;
}

const REMINDER_STAGES: ReminderStage[] = [
  { daysBeforeDue: 14, tag: "j-14", urgency: "info", emoji: "📋", label: "Rappel à 2 semaines", color: "#E3F2FD", borderColor: "#2196F3" },
  { daysBeforeDue: 7, tag: "j-7", urgency: "warning", emoji: "⏰", label: "Rappel à 1 semaine", color: "#FFF3E0", borderColor: "#FF9800" },
  { daysBeforeDue: 3, tag: "j-3", urgency: "urgent", emoji: "⚠️", label: "Rappel urgent – 3 jours", color: "#FFF3E0", borderColor: "#F57C00" },
  { daysBeforeDue: 1, tag: "j-1", urgency: "critical", emoji: "🚨", label: "Dernier rappel – DEMAIN", color: "#FFEBEE", borderColor: "#F44336" },
];

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
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch all invoices with remaining balance and a due date in the future
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .in("payment_status", ["pending", "partial", "unpaid"])
      .gte("due_date", todayStr)
      .not("status", "eq", "cancelled");

    if (error) throw new Error(error.message);

    if (!invoices || invoices.length === 0) {
      console.log("[rappel-paiement] No invoices with pending balance found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun rappel nécessaire" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent reminder emails to avoid duplicates (per stage)
    const invoiceIds = invoices.map(i => i.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEmails } = await supabase
      .from("email_audit_log")
      .select("reference_id, subject")
      .eq("type", "reminder")
      .gte("sent_at", thirtyDaysAgo)
      .in("reference_id", invoiceIds);

    // Build a set of "invoiceId:stage" already sent
    const alreadySent = new Set<string>();
    recentEmails?.forEach(e => {
      for (const stage of REMINDER_STAGES) {
        if (e.subject?.includes(`[${stage.tag}]`)) {
          alreadySent.add(`${e.reference_id}:${stage.tag}`);
        }
      }
    });

    const sender = EMAIL_SENDERS.factures;
    let sentCount = 0;
    const details: Array<{ invoice: string; stage: string; email: string }> = [];

    for (const invoice of invoices) {
      const remaining = invoice.total_amount - (invoice.amount_paid || 0);
      if (remaining <= 0) continue;

      const dueDate = new Date(invoice.due_date + "T00:00:00Z");
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Find applicable stage: pick the closest stage that matches
      let applicableStage: ReminderStage | null = null;
      for (const stage of REMINDER_STAGES) {
        if (daysUntilDue <= stage.daysBeforeDue && daysUntilDue > (stage.daysBeforeDue === 1 ? -1 : REMINDER_STAGES[REMINDER_STAGES.indexOf(stage) + 1]?.daysBeforeDue || 0)) {
          applicableStage = stage;
          break;
        }
      }

      // Simpler matching: find the best stage for this invoice
      if (!applicableStage) {
        if (daysUntilDue <= 1) applicableStage = REMINDER_STAGES[3]; // j-1
        else if (daysUntilDue <= 3) applicableStage = REMINDER_STAGES[2]; // j-3
        else if (daysUntilDue <= 7) applicableStage = REMINDER_STAGES[1]; // j-7
        else if (daysUntilDue <= 14) applicableStage = REMINDER_STAGES[0]; // j-14
      }

      if (!applicableStage) continue;

      const stageKey = `${invoice.id}:${applicableStage.tag}`;
      if (alreadySent.has(stageKey)) continue;

      const hasDeposit = (invoice.amount_paid || 0) > 0;
      const depositInfo = hasDeposit
        ? `<tr><td style="padding:5px 0;font-size:14px;color:#555;">Acompte versé</td><td style="text-align:right;color:#4CAF50;font-weight:600;">${formatPrice(invoice.amount_paid)}</td></tr>`
        : "";

      const urgencyMessage = applicableStage.urgency === "critical"
        ? `<p style="margin:16px 0;padding:12px;background-color:#FFEBEE;border-radius:8px;color:#C62828;font-weight:600;text-align:center;">
            🚨 L'échéance est DEMAIN – merci de procéder au règlement dès aujourd'hui
          </p>`
        : applicableStage.urgency === "urgent"
        ? `<p style="margin:16px 0;padding:12px;background-color:#FFF3E0;border-radius:8px;color:#E65100;font-weight:600;text-align:center;">
            ⚠️ Plus que ${daysUntilDue} jours pour régler le solde
          </p>`
        : "";

      const body = [
        greeting(invoice.client_name),
        paragraph(
          hasDeposit
            ? `Nous vous remercions pour votre acompte. Le solde restant de votre facture <strong>${invoice.invoice_number}</strong> arrive à échéance le <strong>${formatDate(invoice.due_date)}</strong>.`
            : `Nous vous rappelons que votre facture <strong>${invoice.invoice_number}</strong> arrive à échéance le <strong>${formatDate(invoice.due_date)}</strong>.`
        ),
        urgencyMessage,
        separator(),
        `<div style="background:${applicableStage.color};padding:25px;border-radius:12px;border-left:4px solid ${applicableStage.borderColor};margin:20px 0;">
          <p style="margin:0 0 12px 0;font-size:16px;font-family:Georgia,serif;color:#333;">${applicableStage.emoji} ${applicableStage.label}</p>
          <table role="presentation" style="width:100%;">
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Facture n°</td><td style="text-align:right;font-weight:600;color:#333;">${invoice.invoice_number}</td></tr>
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Activité</td><td style="text-align:right;color:#333;">${invoice.activity_title}</td></tr>
            ${invoice.start_date ? `<tr><td style="padding:5px 0;font-size:14px;color:#555;">Date du séjour</td><td style="text-align:right;color:#333;">${formatDate(invoice.start_date)}</td></tr>` : ""}
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Montant total</td><td style="text-align:right;color:#333;">${formatPrice(invoice.total_amount)}</td></tr>
            ${depositInfo}
            <tr><td style="padding:8px 0;font-size:16px;font-weight:600;color:#333;border-top:1px solid #ddd;">Reste à payer</td><td style="text-align:right;font-size:18px;font-weight:700;color:${applicableStage.borderColor};border-top:1px solid #ddd;">${formatPrice(remaining)}</td></tr>
          </table>
          <p style="margin:12px 0 0 0;font-size:13px;color:#999;">📅 Échéance : ${formatDate(invoice.due_date)} (dans ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""})</p>
        </div>`,
        paragraph("Pour régler votre solde, connectez-vous à votre espace personnel ou contactez-nous directement."),
        `<p style="margin:30px 0 0 0;color:#555;font-size:14px;">Équestrement vôtre,<br><strong style="color:#6B8E7F;">L'équipe An Arwen 🐴</strong></p>`,
      ].join("");

      const subjectLine = applicableStage.urgency === "critical"
        ? `🚨 DERNIER RAPPEL [${applicableStage.tag}] – Facture ${invoice.invoice_number} – ${formatPrice(remaining)}`
        : applicableStage.urgency === "urgent"
        ? `⚠️ Rappel urgent [${applicableStage.tag}] – Facture ${invoice.invoice_number} – solde ${formatPrice(remaining)}`
        : `${applicableStage.emoji} Rappel [${applicableStage.tag}] – Facture ${invoice.invoice_number} – solde à régler`;

      const html = wrapInBrandedLayout(applicableStage.label, body, {
        preheader: `${invoice.client_name}, ${formatPrice(remaining)} à régler avant le ${formatDate(invoice.due_date)}`,
        ctaUrl: `${appUrl}/mon-espace`,
        ctaLabel: `Régler ${formatPrice(remaining)}`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: invoice.client_email,
        from: `${sender.name} <${sender.email}>`,
        subject: subjectLine,
        html,
        type: "reminder",
        referenceId: invoice.id,
      });

      if (result.success) {
        sentCount++;
        details.push({ invoice: invoice.invoice_number, stage: applicableStage.tag, email: invoice.client_email });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    // Notify admins if any reminders were sent
    if (sentCount > 0) {
      const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
      const adminSender = EMAIL_SENDERS.notifications;

      const detailRows = details.map(d =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.invoice}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.stage.toUpperCase()}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.email}</td></tr>`
      ).join("");

      const adminBody = [
        greeting("Admin"),
        paragraph(`${sentCount} rappel(s) de paiement envoyé(s) automatiquement :`),
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;background:#F5F3F0;border-radius:12px;overflow:hidden;">
          <thead><tr style="background:#E8652B;color:white;">
            <th style="padding:10px;text-align:left;">Facture</th>
            <th style="padding:10px;text-align:left;">Palier</th>
            <th style="padding:10px;text-align:left;">Client</th>
          </tr></thead>
          <tbody>${detailRows}</tbody>
        </table>`,
      ].join("");

      const adminHtml = wrapInBrandedLayout("📊 Rappels de paiement envoyés", adminBody, {
        preheader: `${sentCount} rappel(s) de paiement envoyé(s)`,
        ctaUrl: `${appUrl}/admin`,
        ctaLabel: "Voir dans l'admin",
      });

      for (const adminEmail of adminEmails) {
        await sendEmailWithAudit({
          supabase,
          to: adminEmail,
          from: `${adminSender.name} <${adminSender.email}>`,
          subject: `📊 ${sentCount} rappel(s) de paiement envoyé(s) – ${new Date().toLocaleDateString("fr-FR")}`,
          html: adminHtml,
          type: "notification",
        });
      }
    }

    console.log(`[rappel-paiement] ${sentCount} reminder(s) sent out of ${invoices.length} invoices checked`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: invoices.length, details }),
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
