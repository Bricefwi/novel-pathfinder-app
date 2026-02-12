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

    // J+10 post-séjour: find bookings ended 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, activities(title, slug)")
      .in("status", ["completed", "confirmed"])
      .gte("end_date", elevenDaysAgo)
      .lte("end_date", tenDaysAgo);

    if (error) throw new Error(error.message);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun avis externe à demander" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-duplicate (30 days)
    const bookingIds = bookings.map(b => b.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "notification")
      .like("subject", "%Google%")
      .gte("sent_at", thirtyDaysAgo)
      .in("reference_id", bookingIds);

    const alreadySent = new Set(recent?.map(r => r.reference_id) || []);
    const sender = EMAIL_SENDERS.contact;
    let sentCount = 0;

    const googleReviewUrl = "https://g.page/r/ferme-equestre-an-arwen/review";
    const facebookUrl = "https://www.facebook.com/fermeequestrearwen/reviews";

    for (const booking of bookings) {
      if (alreadySent.has(booking.id)) continue;

      const activityTitle = booking.activities?.title || "votre séjour";

      const body = [
        paragraph(`Bonjour ${booking.contact_name},`),
        paragraph(`Nous espérons que les souvenirs de <strong>${activityTitle}</strong> restent gravés ! 🌅`),
        separator(),
        paragraph("Il y a quelques jours, vous avez partagé votre avis sur notre site – un grand merci ! 🙏"),
        `<div style="background:#F5F3F0;padding:25px;border-radius:12px;margin:20px 0;text-align:center;">
          <p style="margin:0 0 15px 0;font-size:18px;font-family:Georgia,serif;color:#333;">🌟 Partagez aussi sur les réseaux</p>
          <p style="margin:0 0 20px 0;font-size:14px;color:#666;">Votre avis aide d'autres cavaliers à découvrir An Arwen</p>
          <table role="presentation" style="margin:0 auto;">
            <tr>
              <td style="padding:0 8px;">
                <a href="${googleReviewUrl}" style="display:inline-block;background:#4285F4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">⭐ Google</a>
              </td>
              <td style="padding:0 8px;">
                <a href="${facebookUrl}" style="display:inline-block;background:#1877F2;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">👍 Facebook</a>
              </td>
            </tr>
          </table>
        </div>`,
        paragraph("Chaque avis compte et nous aide à faire connaître notre passion. Merci infiniment ! 🐴🌿"),
      ].join("");

      const html = wrapInBrandedLayout("Partagez votre expérience", body, {
        preheader: `Laissez un avis Google ou Facebook pour ${activityTitle} !`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: booking.contact_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🌟 Partagez votre expérience sur Google & Facebook !`,
        html,
        type: "notification",
        referenceId: booking.id,
      });

      if (result.success) sentCount++;
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: bookings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[demande-avis-externe]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
