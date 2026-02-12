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
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Find profiles not updated in 90 days and with newsletter consent
    const { data: inactiveProfiles, error } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, updated_at, riding_level, dream_destinations")
      .eq("newsletter_subscribed", true)
      .lt("updated_at", ninetyDaysAgo);

    if (error) throw new Error(error.message);

    if (!inactiveProfiles || inactiveProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun profil inactif" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails
    const userIds = inactiveProfiles.map(p => p.user_id);
    const { data: emailsData } = await supabase.rpc("get_user_emails_for_profiles");
    const emailMap = new Map((emailsData || []).map((e: { user_id: string; email: string }) => [e.user_id, e.email]));

    // Anti-duplicate (90 days)
    const { data: recent } = await supabase
      .from("email_audit_log")
      .select("user_id")
      .eq("type", "reminder")
      .like("subject", "%manque%")
      .gte("sent_at", ninetyDaysAgo);

    const alreadySent = new Set(recent?.map(r => r.user_id) || []);
    const sender = EMAIL_SENDERS.newsletter;
    let sentCount = 0;

    for (const profile of inactiveProfiles) {
      if (alreadySent.has(profile.user_id)) continue;
      const email = emailMap.get(profile.user_id);
      if (!email) continue;

      const firstName = profile.first_name || "Cavalier";
      const destinations = ((profile.dream_destinations || []) as string[]).slice(0, 2).join(" et ");

      const body = [
        paragraph(`Bonjour ${firstName},`),
        paragraph(`Cela fait un moment que nous n'avons pas eu de vos nouvelles, et les chevaux d'An Arwen se languissent de vous ! 🐎`),
        separator(),
        `<div style="background:linear-gradient(135deg,#F5F3F0,#FFF8E1);padding:25px;border-radius:12px;margin:20px 0;text-align:center;">
          <p style="margin:0 0 10px 0;font-size:20px;font-family:Georgia,serif;color:#333;">🌿 Vos prochaines aventures vous attendent</p>
          ${destinations ? `<p style="margin:0 0 10px 0;font-size:14px;color:#666;">Vous rêviez de <strong>${destinations}</strong>... et si on en parlait ?</p>` : ""}
          <p style="margin:0;font-size:14px;color:#6B8E7F;font-weight:600;">Découvrez nos nouveaux séjours et activités</p>
        </div>`,
        paragraph("Que ce soit pour une randonnée d'un jour ou un séjour immersif, nous avons de belles surprises à vous proposer cette saison. 🌅"),
        paragraph("Revenez nous rendre visite — les grands espaces bretons et nos chevaux n'attendent que vous ! 🍀"),
      ].join("");

      const html = wrapInBrandedLayout("Vous nous manquez !", body, {
        preheader: `${firstName}, les chevaux d'An Arwen pensent à vous !`,
        ctaUrl: `${appUrl}/destinations`,
        ctaLabel: "Découvrir les nouveautés 🐴",
        unsubscribeUrl: `${appUrl}/mon-espace?tab=profil`,
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🐴 ${firstName}, vous nous manquez à An Arwen !`,
        html,
        type: "reminder",
        userId: profile.user_id,
      });

      if (result.success) sentCount++;
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: inactiveProfiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[reengagement-inactif]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
