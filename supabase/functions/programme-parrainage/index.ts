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

    // Find users with 2+ completed bookings
    const { data: frequentBookers, error } = await supabase
      .from("bookings")
      .select("user_id, contact_email, contact_name")
      .eq("status", "completed");

    if (error) throw new Error(error.message);

    // Count by user_id
    const userBookings = new Map<string, { count: number; name: string; email: string }>();
    for (const b of (frequentBookers || [])) {
      if (!b.user_id) continue;
      const existing = userBookings.get(b.user_id);
      if (existing) {
        existing.count++;
      } else {
        userBookings.set(b.user_id, { count: 1, name: b.contact_name, email: b.contact_email });
      }
    }

    // Filter to 2+ completed
    const ambassadors = Array.from(userBookings.entries())
      .filter(([_, v]) => v.count >= 2)
      .map(([userId, v]) => ({ userId, ...v }));

    if (ambassadors.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun ambassadeur éligible" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-duplicate (180 days)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("user_id")
      .eq("type", "notification")
      .like("subject", "%parrainage%")
      .gte("sent_at", sixMonthsAgo);

    const alreadySent = new Set(recent?.map(r => r.user_id) || []);
    const sender = EMAIL_SENDERS.newsletter;
    let sentCount = 0;

    for (const ambassador of ambassadors) {
      if (alreadySent.has(ambassador.userId)) continue;

      const body = [
        paragraph(`Bonjour ${ambassador.name},`),
        paragraph(`Avec <strong>${ambassador.count} séjours</strong> chez nous, vous faites partie de la famille An Arwen ! 🏇`),
        separator(),
        `<div style="background:linear-gradient(135deg,#F5F3F0,#FFF8E1);padding:30px;border-radius:12px;margin:20px 0;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:28px;">🎁</p>
          <p style="margin:0 0 10px 0;font-size:20px;font-family:Georgia,serif;color:#333;">Programme Ambassadeur</p>
          <p style="margin:0 0 15px 0;font-size:14px;color:#666;">Recommandez An Arwen et profitez d'avantages exclusifs !</p>
          <div style="background:#fff;padding:20px;border-radius:8px;border:2px dashed #C9B896;margin:15px 0;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#333;font-weight:600;">Pour votre filleul(e) :</p>
            <p style="margin:0 0 12px 0;font-size:16px;color:#6B8E7F;font-weight:700;">🎉 -10% sur le premier séjour</p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#333;font-weight:600;">Pour vous :</p>
            <p style="margin:0;font-size:16px;color:#6B8E7F;font-weight:700;">🎁 -15% sur votre prochain séjour</p>
          </div>
        </div>`,
        paragraph("Pour parrainer, rien de plus simple : transmettez ce mail à vos proches cavaliers, ou envoyez-nous leur coordonnées et nous les contacterons de votre part. 🌿"),
        paragraph("Merci pour votre fidélité et votre confiance ! 🐴❤️"),
      ].join("");

      const html = wrapInBrandedLayout("Devenez Ambassadeur An Arwen", body, {
        preheader: `${ambassador.name}, devenez ambassadeur et profitez de -15% !`,
        ctaUrl: `${appUrl}/contact`,
        ctaLabel: "Parrainer un proche 🎁",
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: ambassador.email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🎁 ${ambassador.name}, devenez ambassadeur An Arwen – parrainage exclusif !`,
        html,
        type: "notification",
        userId: ambassador.userId,
      });

      if (result.success) sentCount++;
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: ambassadors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[programme-parrainage]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
