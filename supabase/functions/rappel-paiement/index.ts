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
 * rappel-paiement — Relances conditionnelles INSTALLMENT-AWARE
 *
 * Logique sécurisée :
 * 1. Récupère uniquement les `payment_schedules` avec status ∈ ('pending','sent')
 *    → on ne relance JAMAIS un versement déjà payé (status='paid') ou annulé.
 * 2. Pour chaque échéance, vérifie en plus dans `payments` qu'aucun paiement
 *    réussi ne couvre cette installment (double garde-fou anti-doublon).
 * 3. Détermine le palier (J-14 / J-7 / J-3 / J-1) selon `due_date`.
 * 4. Empêche le ré-envoi du même palier via `email_audit_log` (clé reference_id+tag).
 * 5. Pour les paiements en plusieurs fois, indique clairement "Versement X/Y".
 *
 * Cette fonction REMPLACE l'ancienne logique basée sur `invoices.payment_status`
 * qui ne distinguait pas les différents versements d'un échéancier.
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

function pickStage(daysUntilDue: number): ReminderStage | null {
  if (daysUntilDue <= 1) return REMINDER_STAGES[3];
  if (daysUntilDue <= 3) return REMINDER_STAGES[2];
  if (daysUntilDue <= 7) return REMINDER_STAGES[1];
  if (daysUntilDue <= 14) return REMINDER_STAGES[0];
  return null;
}

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

    // ──────────────────────────────────────────────────────────────────
    // STEP 1 — Récupérer UNIQUEMENT les échéances ouvertes
    // status ∈ ('pending','sent') → exclut 'paid' et 'cancelled'
    // due_date ≥ today AND ≤ today+14 → seulement la fenêtre de relance
    // ──────────────────────────────────────────────────────────────────
    const fourteenDaysAhead = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const { data: schedules, error: schedError } = await supabase
      .from("payment_schedules")
      .select(`
        id, installment_number, total_installments, expected_amount,
        due_date, status, link_sent_at, paid_at,
        quote_id, invoice_id,
        quotes:quote_id (
          id, quote_number, client_name, client_email, activity_title, start_date, total_price,
          status, cancelled_at, cancellation_reason
        ),
        invoices:invoice_id (
          id, invoice_number, client_name, client_email, activity_title, start_date,
          status, payment_status
        )
      `)
      .in("status", ["pending", "sent"])
      .gte("due_date", todayStr)
      .lte("due_date", fourteenDaysAhead);

    if (schedError) throw new Error(schedError.message);

    if (!schedules || schedules.length === 0) {
      console.log("[rappel-paiement] Aucune échéance ouverte dans la fenêtre J-14 → J-0");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun rappel nécessaire" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 2 — Double-vérification : ces échéances n'ont aucun paiement réussi
    // ──────────────────────────────────────────────────────────────────
    const quoteIds = [...new Set(schedules.map(s => s.quote_id).filter(Boolean))];
    const invoiceIds = [...new Set(schedules.map(s => s.invoice_id).filter(Boolean))];

    const { data: successfulPayments } = await supabase
      .from("payments")
      .select("quote_id, invoice_id, amount, metadata, status")
      .in("status", ["succeeded", "paid", "completed"])
      .or(
        `quote_id.in.(${quoteIds.join(",") || "00000000-0000-0000-0000-000000000000"}),invoice_id.in.(${invoiceIds.join(",") || "00000000-0000-0000-0000-000000000000"})`
      );

    // Construire un Set des "quote_id:installment_number" déjà payés
    const paidInstallments = new Set<string>();
    successfulPayments?.forEach(p => {
      const meta = (p.metadata || {}) as Record<string, unknown>;
      const inst = Number(meta.installment_number);
      if (p.quote_id && inst) paidInstallments.add(`${p.quote_id}:${inst}`);
      if (p.invoice_id && inst) paidInstallments.add(`inv-${p.invoice_id}:${inst}`);
    });

    // ──────────────────────────────────────────────────────────────────
    // STEP 3 — Récupérer relances déjà envoyées (anti-doublon par palier)
    // ──────────────────────────────────────────────────────────────────
    const scheduleIds = schedules.map(s => s.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEmails } = await supabase
      .from("email_audit_log")
      .select("reference_id, subject")
      .eq("type", "reminder")
      .gte("sent_at", thirtyDaysAgo)
      .in("reference_id", scheduleIds);

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
    let skippedPaid = 0;
    let skippedCancelled = 0;
    let skippedDuplicate = 0;
    const details: Array<{ schedule: string; stage: string; email: string; installment: string }> = [];

    // ──────────────────────────────────────────────────────────────────
    // STEP 4 — Boucle de relance avec garde-fous
    // ──────────────────────────────────────────────────────────────────
    for (const schedule of schedules) {
      // Garde-fou 0 : devis ou facture parent annulé(e)
      const parentQuote = (schedule as any).quotes;
      const parentInvoice = (schedule as any).invoices;
      const isCancelled =
        (parentQuote && parentQuote.status === "cancelled") ||
        (parentInvoice && (parentInvoice.status === "cancelled" || parentInvoice.payment_status === "cancelled"));

      if (isCancelled) {
        skippedCancelled++;
        const ref = parentQuote?.quote_number || parentInvoice?.invoice_number || schedule.id;
        const motif = parentQuote?.cancellation_reason || "Devis/facture annulé(e)";
        console.log(`[rappel-paiement] ⛔ Skip schedule ${schedule.id} (${ref}) — parent annulé. Motif: ${motif}`);

        // Auto-correction : annuler le schedule pending pour cohérence
        if (schedule.status === "pending" || schedule.status === "sent") {
          await supabase
            .from("payment_schedules")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              notes: `Annulé automatiquement — parent ${ref} annulé. Motif : ${motif}`,
            })
            .eq("id", schedule.id);
        }

        // Audit trace
        await supabase.from("email_audit_log").insert({
          type: "reminder_skipped",
          recipient: parentQuote?.client_email || parentInvoice?.client_email || "system",
          subject: `[SKIP] Relance échéance ${schedule.installment_number} bloquée — ${ref} annulé`,
          status: "skipped",
          error_message: `Parent cancelled. Motif: ${motif}`,
          reference_id: schedule.id,
        });
        continue;
      }

      // Garde-fou 1 : versement déjà payé (vérification croisée payments)
      const paidKey = schedule.quote_id
        ? `${schedule.quote_id}:${schedule.installment_number}`
        : `inv-${schedule.invoice_id}:${schedule.installment_number}`;
      if (paidInstallments.has(paidKey)) {
        skippedPaid++;
        console.log(`[rappel-paiement] Skip schedule ${schedule.id} — versement ${schedule.installment_number} déjà payé`);
        // Auto-correction : marquer le schedule comme payé si pas déjà fait
        if (schedule.status !== "paid") {
          await supabase
            .from("payment_schedules")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", schedule.id);
        }
        continue;
      }

      // Garde-fou 2 : pas de due_date
      if (!schedule.due_date) continue;

      const dueDate = new Date(schedule.due_date + "T00:00:00Z");
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const stage = pickStage(daysUntilDue);
      if (!stage) continue;

      // Garde-fou 3 : palier déjà envoyé pour cette échéance
      const stageKey = `${schedule.id}:${stage.tag}`;
      if (alreadySent.has(stageKey)) {
        skippedDuplicate++;
        continue;
      }

      // Récupérer infos client (devis prioritaire)
      const parent = schedule.quotes || schedule.invoices;
      if (!parent) continue;

      const clientName = parent.client_name;
      const clientEmail = parent.client_email;
      const docNumber = (schedule.quotes as { quote_number?: string })?.quote_number
        || (schedule.invoices as { invoice_number?: string })?.invoice_number
        || "—";
      const activityTitle = parent.activity_title;
      const startDate = parent.start_date;
      const totalPrice = (schedule.quotes as { total_price?: number })?.total_price;

      // Construire l'en-tête du versement
      const installmentLabel = schedule.total_installments > 1
        ? `Versement ${schedule.installment_number}/${schedule.total_installments}`
        : `Paiement`;

      const urgencyMessage = stage.urgency === "critical"
        ? `<p style="margin:16px 0;padding:12px;background-color:#FFEBEE;border-radius:8px;color:#C62828;font-weight:600;text-align:center;">
            🚨 L'échéance est DEMAIN – merci de procéder au règlement dès aujourd'hui
          </p>`
        : stage.urgency === "urgent"
        ? `<p style="margin:16px 0;padding:12px;background-color:#FFF3E0;border-radius:8px;color:#E65100;font-weight:600;text-align:center;">
            ⚠️ Plus que ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""} pour régler ce versement
          </p>`
        : "";

      const totalLine = totalPrice && schedule.total_installments > 1
        ? `<tr><td style="padding:5px 0;font-size:13px;color:#777;">Montant total du séjour</td><td style="text-align:right;color:#777;font-size:13px;">${formatPrice(totalPrice)}</td></tr>`
        : "";

      const body = [
        greeting(clientName),
        paragraph(
          schedule.total_installments > 1
            ? `Nous vous rappelons que le <strong>versement ${schedule.installment_number} sur ${schedule.total_installments}</strong> de votre paiement échelonné (référence <strong>${docNumber}</strong>) arrive à échéance le <strong>${formatDate(schedule.due_date)}</strong>.`
            : `Nous vous rappelons que votre paiement (référence <strong>${docNumber}</strong>) arrive à échéance le <strong>${formatDate(schedule.due_date)}</strong>.`
        ),
        urgencyMessage,
        separator(),
        `<div style="background:${stage.color};padding:25px;border-radius:12px;border-left:4px solid ${stage.borderColor};margin:20px 0;">
          <p style="margin:0 0 12px 0;font-size:16px;font-family:Georgia,serif;color:#333;">${stage.emoji} ${stage.label} – ${installmentLabel}</p>
          <table role="presentation" style="width:100%;">
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Référence</td><td style="text-align:right;font-weight:600;color:#333;">${docNumber}</td></tr>
            <tr><td style="padding:5px 0;font-size:14px;color:#555;">Activité</td><td style="text-align:right;color:#333;">${activityTitle}</td></tr>
            ${startDate ? `<tr><td style="padding:5px 0;font-size:14px;color:#555;">Date du séjour</td><td style="text-align:right;color:#333;">${formatDate(startDate)}</td></tr>` : ""}
            ${totalLine}
            <tr><td style="padding:8px 0;font-size:16px;font-weight:600;color:#333;border-top:1px solid #ddd;">${installmentLabel} à régler</td><td style="text-align:right;font-size:18px;font-weight:700;color:${stage.borderColor};border-top:1px solid #ddd;">${formatPrice(schedule.expected_amount)}</td></tr>
          </table>
          <p style="margin:12px 0 0 0;font-size:13px;color:#999;">📅 Échéance : ${formatDate(schedule.due_date)} (dans ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""})</p>
        </div>`,
        paragraph(
          schedule.payment_link_url
            ? "Pour régler ce versement, utilisez le lien de paiement sécurisé qui vous a été transmis ou connectez-vous à votre espace personnel."
            : "Pour régler ce versement, connectez-vous à votre espace personnel ou contactez-nous pour recevoir un nouveau lien de paiement."
        ),
        `<p style="margin:30px 0 0 0;color:#555;font-size:14px;">Équestrement vôtre,<br><strong style="color:#6B8E7F;">L'équipe An Arwen 🐴</strong></p>`,
      ].join("");

      const subjectLine = stage.urgency === "critical"
        ? `🚨 DERNIER RAPPEL [${stage.tag}] – ${installmentLabel} ${docNumber} – ${formatPrice(schedule.expected_amount)}`
        : stage.urgency === "urgent"
        ? `⚠️ Rappel urgent [${stage.tag}] – ${installmentLabel} ${docNumber} – ${formatPrice(schedule.expected_amount)}`
        : `${stage.emoji} Rappel [${stage.tag}] – ${installmentLabel} ${docNumber} – à régler`;

      const html = wrapInBrandedLayout(`${stage.label} – ${installmentLabel}`, body, {
        preheader: `${clientName}, ${formatPrice(schedule.expected_amount)} (versement ${schedule.installment_number}/${schedule.total_installments}) à régler avant le ${formatDate(schedule.due_date)}`,
        ctaUrl: schedule.payment_link_url || `${appUrl}/mon-espace`,
        ctaLabel: `Régler ${formatPrice(schedule.expected_amount)}`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: clientEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: subjectLine,
        html,
        type: "reminder",
        referenceId: schedule.id, // ← clé d'audit = schedule.id (pas invoice.id)
      });

      if (result.success) {
        sentCount++;
        details.push({
          schedule: docNumber,
          stage: stage.tag,
          email: clientEmail,
          installment: `${schedule.installment_number}/${schedule.total_installments}`,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 5 — Notification admin avec compteurs détaillés
    // ──────────────────────────────────────────────────────────────────
    if (sentCount > 0) {
      const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
      const adminSender = EMAIL_SENDERS.notifications;

      const detailRows = details.map(d =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.schedule}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">Vers. ${d.installment}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.stage.toUpperCase()}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.email}</td></tr>`
      ).join("");

      const adminBody = [
        greeting("Admin"),
        paragraph(`<strong>${sentCount}</strong> rappel(s) envoyé(s) — <strong>${skippedPaid}</strong> ignoré(s) (déjà payé) — <strong>${skippedCancelled}</strong> ignoré(s) (devis annulé) — <strong>${skippedDuplicate}</strong> ignoré(s) (palier déjà envoyé).`),
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;background:#F5F3F0;border-radius:12px;overflow:hidden;">
          <thead><tr style="background:#E8652B;color:white;">
            <th style="padding:10px;text-align:left;">Référence</th>
            <th style="padding:10px;text-align:left;">Versement</th>
            <th style="padding:10px;text-align:left;">Palier</th>
            <th style="padding:10px;text-align:left;">Client</th>
          </tr></thead>
          <tbody>${detailRows}</tbody>
        </table>`,
        paragraph("Chaque relance a été émise <strong>uniquement après vérification</strong> que le versement correspondant n'avait pas été encaissé (table <code>payments</code> + <code>payment_schedules.status</code>)."),
      ].join("");

      const adminHtml = wrapInBrandedLayout("📊 Rappels de paiement (échéancier)", adminBody, {
        preheader: `${sentCount} rappel(s) envoyé(s), ${skippedPaid} ignoré(s) (payés)`,
        ctaUrl: `${appUrl}/admin`,
        ctaLabel: "Voir dans l'admin",
      });

      for (const adminEmail of adminEmails) {
        await sendEmailWithAudit({
          supabase,
          to: adminEmail,
          from: `${adminSender.name} <${adminSender.email}>`,
          subject: `📊 ${sentCount} rappel(s) versements – ${new Date().toLocaleDateString("fr-FR")}`,
          html: adminHtml,
          type: "notification",
        });
      }
    }

    console.log(`[rappel-paiement] sent=${sentCount} skipped_paid=${skippedPaid} skipped_duplicate=${skippedDuplicate} schedules_checked=${schedules.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped_paid: skippedPaid,
        skipped_duplicate: skippedDuplicate,
        total_checked: schedules.length,
        details,
      }),
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
