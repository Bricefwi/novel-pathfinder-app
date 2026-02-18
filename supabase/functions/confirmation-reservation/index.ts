import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  formatDate, formatPrice, paragraph, separator, activityCard,
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

    const appUrl = getAppUrl();

    // Find recently confirmed bookings (last 2 hours) that haven't been notified
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, activities(title, slug, duration, location)")
      .eq("status", "confirmed")
      .gte("updated_at", twoHoursAgo);

    if (error) throw new Error(error.message);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucune confirmation à envoyer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-duplicate
    const bookingIds = bookings.map(b => b.id);
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "notification")
      .like("subject", "%confirmée%")
      .in("reference_id", bookingIds);

    const alreadySent = new Set(recent?.map(r => r.reference_id) || []);
    const sender = EMAIL_SENDERS.devis;
    let sentCount = 0;

    for (const booking of bookings) {
      if (alreadySent.has(booking.id)) continue;

      const activity = booking.activities;
      const activityTitle = activity?.title || booking.activity_id || "votre activité";

      const body = [
        paragraph(`Bonjour ${booking.contact_name},`),
        paragraph("Votre réservation est <strong>officiellement confirmée</strong> ! 🎉"),
        separator(),
        activityCard({
          title: activityTitle,
          duration: activity?.duration || undefined,
          startDate: booking.start_date,
          endDate: booking.end_date,
          participants: booking.participants,
        }),
        `<div style="background:#E8F5E9;padding:20px;border-radius:12px;border-left:4px solid #4CAF50;margin:20px 0;">
          <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#2E7D32;">✅ Réservation confirmée</p>
          ${booking.total_price ? `<p style="margin:0 0 5px 0;font-size:14px;color:#555;">💶 Montant total : <strong>${formatPrice(booking.total_price)}</strong></p>` : ""}
          ${activity?.location ? `<p style="margin:0;font-size:14px;color:#555;">📍 Lieu : ${activity.location}</p>` : ""}
        </div>`,
        paragraph("Retrouvez tous les détails dans votre espace personnel. N'hésitez pas à nous contacter pour toute question. 🐴"),
        paragraph("Au plaisir de vous accueillir très bientôt ! 🌿"),
      ].join("");

      const html = wrapInBrandedLayout("Réservation confirmée !", body, {
        preheader: `Votre réservation pour ${activityTitle} est confirmée !`,
        ctaUrl: `${appUrl}/mon-espace`,
        ctaLabel: "Accéder à mon espace",
        footerExtra: `<p style="margin:0;color:#888;font-size:12px;text-align:center;">Réservation du ${formatDate(booking.start_date)} au ${formatDate(booking.end_date)}</p>`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: booking.contact_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `✅ Votre réservation pour ${activityTitle} est confirmée !`,
        html,
        type: "notification",
        referenceId: booking.id,
      });

      // Send BCC copies to all admins
      if (result.success) {
        sentCount++;
        const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map(e => e.trim()).filter(Boolean);
        for (const adminEmail of adminEmails) {
          if (adminEmail.toLowerCase() === booking.contact_email.toLowerCase()) continue;
          await sendEmailWithAudit({
            supabase,
            to: adminEmail,
            from: `${sender.name} <${sender.email}>`,
            subject: `[Copie] Réservation confirmée – ${activityTitle} → ${booking.contact_name}`,
            html,
            type: "notification",
            referenceId: booking.id,
          });
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: bookings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[confirmation-reservation]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
