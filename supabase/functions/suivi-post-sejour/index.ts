import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  formatDate, paragraph, separator,
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
    // 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Find bookings that ended 3 days ago (completed or confirmed)
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*, activities(title, slug)")
      .in("status", ["confirmed", "completed"])
      .gte("end_date", fourDaysAgo)
      .lte("end_date", threeDaysAgo);

    if (fetchError) {
      console.error("[suivi-post-sejour] Error:", fetchError);
      throw new Error("Impossible de récupérer les réservations");
    }

    if (!bookings || bookings.length === 0) {
      console.log("[suivi-post-sejour] Aucune réservation à suivre");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun suivi à envoyer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for already sent follow-ups (last 14 days)
    const bookingIds = bookings.map(b => b.id);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentFollowUps } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "notification")
      .like("subject", "%avis%")
      .gte("sent_at", twoWeeksAgo)
      .in("reference_id", bookingIds);

    const alreadySent = new Set(recentFollowUps?.map(r => r.reference_id) || []);

    const sender = EMAIL_SENDERS.contact;
    let sentCount = 0;
    const results: Array<{ client: string; activity: string; status: string }> = [];

    for (const booking of bookings) {
      if (alreadySent.has(booking.id)) {
        results.push({ client: booking.contact_name, activity: booking.activities?.title || "N/A", status: "skipped" });
        continue;
      }

      const activityTitle = booking.activities?.title || "votre séjour";
      const activitySlug = booking.activities?.slug || "";
      const reviewUrl = `${appUrl}/mon-espace?tab=avis`;

      const bodyContent = [
        paragraph(`Bonjour ${booking.contact_name},`),
        paragraph(`Nous espérons que vous avez passé un merveilleux moment lors de <strong>${activityTitle}</strong> ! 🐴`),
        separator(),
        `<div style="background:#F5F3F0;padding:25px;border-radius:12px;border-left:4px solid #6B8E7F;margin:20px 0;text-align:center;">
          <p style="margin:0 0 10px 0;font-size:18px;font-family:Georgia,serif;color:#333;">⭐ Votre avis compte énormément</p>
          <p style="margin:0 0 15px 0;font-size:14px;color:#666;">Partagez votre expérience et aidez d'autres cavaliers à découvrir An Arwen</p>
        </div>`,
        paragraph("En quelques clics, racontez-nous votre expérience. Vos retours nous aident à nous améliorer et inspirent de futurs cavaliers ! 🌿"),
        paragraph("Merci du fond du cœur pour votre confiance. À très bientôt en selle ! 🐎"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("Votre avis nous intéresse", bodyContent, {
        preheader: `Comment s'est passé ${activityTitle} ? Partagez votre avis !`,
        ctaUrl: reviewUrl,
        ctaLabel: "Donner mon avis ⭐",
        footerExtra: `<p style="margin:0;color:#888;font-size:12px;text-align:center;">Réservation du ${formatDate(booking.start_date)} au ${formatDate(booking.end_date)}</p>`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: booking.contact_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `⭐ Comment s'est passé ${activityTitle} ? Votre avis compte !`,
        html: htmlContent,
        type: "notification",
        referenceId: booking.id,
      });

      if (result.success) {
        sentCount++;
        results.push({ client: booking.contact_name, activity: activityTitle, status: "sent" });
        // Mark booking as completed
        await supabase.from("bookings").update({ status: "completed" }).eq("id", booking.id);
      } else {
        results.push({ client: booking.contact_name, activity: activityTitle, status: `failed: ${result.error}` });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[suivi-post-sejour] ${sentCount} suivis envoyés`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: bookings.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[suivi-post-sejour]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
