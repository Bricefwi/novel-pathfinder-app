import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout,
  paragraph, separator, formatPrice,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Gather weekly stats
    const [bookingsRes, quotesRes, invoicesRes, reviewsRes, contactsRes, profilesRes, emailsRes] = await Promise.all([
      supabase.from("bookings").select("id, total_price, status").gte("created_at", oneWeekAgo),
      supabase.from("quotes").select("id, total_price, status").gte("created_at", oneWeekAgo),
      supabase.from("invoices").select("id, total_amount, payment_status").gte("created_at", oneWeekAgo),
      supabase.from("user_reviews").select("id, rating").gte("created_at", oneWeekAgo),
      supabase.from("contact_requests").select("id").gte("created_at", oneWeekAgo),
      supabase.from("profiles").select("id").gte("created_at", oneWeekAgo),
      supabase.from("email_audit_log").select("id, status").gte("created_at", oneWeekAgo),
    ]);

    const bookings = bookingsRes.data || [];
    const quotes = quotesRes.data || [];
    const invoices = invoicesRes.data || [];
    const reviews = reviewsRes.data || [];
    const contacts = contactsRes.data || [];
    const newProfiles = profilesRes.data || [];
    const emails = emailsRes.data || [];

    const totalCA = invoices
      .filter(i => i.payment_status === "paid")
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "—";
    const emailsSent = emails.filter(e => e.status === "sent").length;
    const emailsFailed = emails.filter(e => e.status === "failed" || e.status === "error").length;

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const weekEnd = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const kpiRow = (emoji: string, label: string, value: string | number) =>
      `<tr>
        <td style="padding:10px 15px;font-size:14px;color:#555;border-bottom:1px solid #EDEBE8;">${emoji} ${label}</td>
        <td style="padding:10px 15px;text-align:right;font-size:16px;font-weight:600;color:#333;border-bottom:1px solid #EDEBE8;">${value}</td>
      </tr>`;

    const body = [
      paragraph("Bonjour Loïc,"),
      paragraph(`Voici le résumé de la semaine du <strong>${weekStart}</strong> au <strong>${weekEnd}</strong>.`),
      separator(),

      `<div style="background:#F5F3F0;padding:25px;border-radius:12px;margin:20px 0;">
        <p style="margin:0 0 15px 0;font-size:18px;font-family:Georgia,serif;color:#333;">📊 KPIs de la semaine</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          ${kpiRow("💶", "Chiffre d'affaires", totalCA > 0 ? formatPrice(totalCA) : "0 €")}
          ${kpiRow("📋", "Devis créés", quotes.length)}
          ${kpiRow("📅", "Réservations confirmées", confirmedBookings)}
          ${kpiRow("🧾", "Factures émises", invoices.length)}
          ${kpiRow("⭐", "Avis reçus (moy.)", `${reviews.length} (${avgRating}/5)`)}
          ${kpiRow("📩", "Demandes de contact", contacts.length)}
          ${kpiRow("👤", "Nouveaux inscrits", newProfiles.length)}
          ${kpiRow("✉️", "Emails envoyés", `${emailsSent} ✅ / ${emailsFailed} ❌`)}
        </table>
      </div>`,

      quotes.length > 0
        ? `<div style="background:#FFF8E1;padding:15px 20px;border-radius:8px;border-left:4px solid #C9B896;margin:15px 0;">
            <p style="margin:0;font-size:13px;color:#666;">💡 <strong>${quotes.filter(q => q.status === "draft").length}</strong> devis en attente de réponse client</p>
          </div>`
        : "",

      paragraph("Bonne semaine ! 🐴🌿"),
    ].join("");

    const html = wrapInBrandedLayout(`Résumé hebdo – ${weekStart} au ${weekEnd}`, body, {
      preheader: `Résumé An Arwen : ${confirmedBookings} réservations, ${reviews.length} avis, ${totalCA > 0 ? formatPrice(totalCA) : "0 €"} CA`,
    });

    // Send to all admin emails
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
    const sender = EMAIL_SENDERS.notifications;
    let sentCount = 0;

    for (const adminEmail of adminEmails) {
      const result = await sendEmailWithAudit({
        supabase,
        to: adminEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: `📊 Résumé hebdo An Arwen – ${weekStart} au ${weekEnd}`,
        html,
        type: "report",
      });
      if (result.success) sentCount++;
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, stats: { bookings: bookings.length, quotes: quotes.length, reviews: reviews.length, ca: totalCA } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[resume-hebdo]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
