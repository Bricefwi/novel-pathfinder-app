import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  paragraph, separator,
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

    // Find reviews created in the last hour (for near-realtime cron every 30 min)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: newReviews, error } = await supabase
      .from("user_reviews")
      .select("*, activities(title)")
      .gte("created_at", oneHourAgo);

    if (error) {
      console.error("[notif-avis] Error:", error);
      throw new Error("Erreur récupération avis");
    }

    if (!newReviews || newReviews.length === 0) {
      console.log("[notif-avis] Aucun nouvel avis");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun nouvel avis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-doublon
    const reviewIds = newReviews.map(r => r.id);
    const { data: alreadyNotified } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "alert")
      .like("subject", "%nouvel avis%")
      .in("reference_id", reviewIds);

    const alreadySent = new Set(alreadyNotified?.map(r => r.reference_id) || []);

    const adminEmails = Deno.env.get("ADMIN_NOTIFICATION_EMAILS");
    if (!adminEmails) {
      console.log("[notif-avis] No ADMIN_NOTIFICATION_EMAILS configured");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Pas d'emails admin configurés" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let thankedCount = 0;
    const results: Array<{ review_id: string; status: string }> = [];

    for (const review of newReviews) {
      if (alreadySent.has(review.id)) {
        results.push({ review_id: review.id, status: "skipped" });
        continue;
      }

      // Get reviewer info
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", review.user_id)
        .single();

      const reviewerName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Un client";
      const activityTitle = review.activities?.title || "Activité";
      const stars = "⭐".repeat(Math.min(review.rating, 5));

      // 1. Admin notification
      const adminBody = [
        paragraph(`Un nouvel avis a été publié par <strong>${reviewerName}</strong> :`),
        `<div style="background:#F5F3F0;padding:20px;border-radius:12px;border-left:4px solid #C9B896;margin:20px 0;">
          <p style="margin:0 0 8px 0;font-size:20px;">${stars}</p>
          <p style="margin:0 0 8px 0;font-size:14px;color:#555;">🐴 <strong>${activityTitle}</strong></p>
          <p style="margin:0;font-size:15px;color:#333;font-style:italic;">"${review.content.slice(0, 300)}${review.content.length > 300 ? "..." : ""}"</p>
        </div>`,
        paragraph(`Statut : ${review.is_approved ? "✅ Approuvé" : "⏳ En attente de modération"}`),
      ].join("");

      const adminHtml = wrapInBrandedLayout("Nouvel avis client", adminBody, {
        preheader: `${reviewerName} a laissé un avis ${stars}`,
        ctaUrl: `${appUrl}/admin`,
        ctaLabel: "Gérer les avis",
      });

      for (const adminEmail of adminEmails.split(",").map(e => e.trim())) {
        const result = await sendEmailWithAudit({
          supabase,
          to: adminEmail,
          from: `${EMAIL_SENDERS.notifications.name} <${EMAIL_SENDERS.notifications.email}>`,
          subject: `⭐ Nouvel avis ${stars} de ${reviewerName} – ${activityTitle}`,
          html: adminHtml,
          type: "alert",
          referenceId: review.id,
        });

        if (result.success) sentCount++;
      }

      // 2. Thank you email to reviewer
      const { data: reviewerUser } = await supabase.auth.admin.getUserById(review.user_id);
      if (reviewerUser?.user?.email) {
        const thankBody = [
          paragraph(`Bonjour ${profile?.first_name || "cher cavalier"},`),
          paragraph("Merci infiniment d'avoir pris le temps de partager votre expérience ! 🙏"),
          `<div style="text-align:center;padding:15px 0;">
            <p style="font-size:28px;margin:0;">${stars}</p>
          </div>`,
          paragraph("Votre avis aide d'autres passionnés à découvrir An Arwen et nous motive à toujours faire mieux. 🌿"),
          paragraph("À très bientôt pour de nouvelles aventures équestres ! 🐎"),
        ].join("");

        const thankHtml = wrapInBrandedLayout("Merci pour votre avis !", thankBody, {
          preheader: "Merci d'avoir partagé votre expérience !",
          ctaUrl: `${appUrl}/destinations`,
          ctaLabel: "Découvrir nos prochains séjours",
        });

        const thankResult = await sendEmailWithAudit({
          supabase,
          to: reviewerUser.user.email,
          from: `${EMAIL_SENDERS.contact.name} <${EMAIL_SENDERS.contact.email}>`,
          subject: "🙏 Merci pour votre avis – An Arwen",
          html: thankHtml,
          type: "notification",
          userId: review.user_id,
          referenceId: review.id,
        });

        if (thankResult.success) thankedCount++;
      }

      results.push({ review_id: review.id, status: "notified" });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[notif-avis] ${sentCount} notifs admin, ${thankedCount} remerciements`);
    return new Response(
      JSON.stringify({ success: true, adminNotified: sentCount, thanked: thankedCount, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[notif-avis]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
