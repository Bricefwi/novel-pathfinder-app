import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  formatDate, paragraph, separator, activityCard,
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
    // Date in 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, activities(title, slug, location, duration)")
      .eq("status", "confirmed")
      .gte("start_date", sixDaysFromNow)
      .lte("start_date", sevenDaysFromNow);

    if (error) {
      console.error("[rappel-j7] Error:", error);
      throw new Error("Erreur récupération réservations");
    }

    if (!bookings || bookings.length === 0) {
      console.log("[rappel-j7] Aucun rappel à envoyer");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun rappel J-7" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-doublon
    const bookingIds = bookings.map(b => b.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: alreadySentList } = await supabase
      .from("email_audit_log")
      .select("reference_id")
      .eq("type", "reminder")
      .like("subject", "%J-7%")
      .gte("sent_at", thirtyDaysAgo)
      .in("reference_id", bookingIds);

    const alreadySent = new Set(alreadySentList?.map(r => r.reference_id) || []);

    const sender = EMAIL_SENDERS.relance;
    let sentCount = 0;
    const results: Array<{ client: string; status: string }> = [];

    for (const booking of bookings) {
      if (alreadySent.has(booking.id)) {
        results.push({ client: booking.contact_name, status: "skipped" });
        continue;
      }

      const activityTitle = booking.activities?.title || "votre séjour";
      const location = booking.activities?.location || "An Arwen";

      const checklist = [
        "✅ Vêtements adaptés à l'équitation (pantalon long, chaussures fermées)",
        "✅ Veste imperméable (nous sommes en Bretagne ! 🌧️)",
        "✅ Crème solaire et casquette (si beau temps ☀️)",
        "✅ Gourde d'eau",
        "✅ Appareil photo pour immortaliser vos aventures 📸",
        "✅ Bonne humeur et envie de découverte ! 🌿",
      ];

      const bodyContent = [
        paragraph(`Bonjour ${booking.contact_name},`),
        paragraph(`Plus que <strong>7 jours</strong> avant votre aventure équestre ! 🎉`),
        activityCard({
          title: activityTitle,
          duration: booking.activities?.duration || undefined,
          startDate: booking.start_date,
          endDate: booking.end_date || undefined,
          participants: booking.participants || undefined,
        }),
        separator(),
        `<div style="background:#F5F3F0;padding:20px;border-radius:12px;margin:20px 0;">
          <h3 style="margin:0 0 15px 0;color:#333;font-family:Georgia,serif;font-size:16px;">🎒 Checklist de préparation</h3>
          ${checklist.map(item => `<p style="margin:4px 0;font-size:14px;color:#555;">${item}</p>`).join("")}
        </div>`,
        paragraph(`📍 <strong>Lieu :</strong> ${location}`),
        paragraph("N'hésitez pas à nous contacter si vous avez des questions. On a hâte de vous accueillir ! 🐴"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("J-7 avant votre séjour", bodyContent, {
        preheader: `Plus que 7 jours avant ${activityTitle} ! Préparez-vous 🎒`,
        ctaUrl: `${appUrl}/preparer-voyage`,
        ctaLabel: "Préparer mon voyage 🗺️",
        footerExtra: `<p style="margin:0;color:#888;font-size:12px;text-align:center;">Réservation #${booking.id.slice(0, 8)}</p>`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: booking.contact_email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🐴 J-7 avant ${activityTitle} – Préparez-vous !`,
        html: htmlContent,
        type: "reminder",
        referenceId: booking.id,
      });

      if (result.success) {
        sentCount++;
        results.push({ client: booking.contact_name, status: "sent" });
      } else {
        results.push({ client: booking.contact_name, status: `failed: ${result.error}` });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[rappel-j7] ${sentCount} rappels envoyés`);
    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: bookings.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[rappel-j7]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
