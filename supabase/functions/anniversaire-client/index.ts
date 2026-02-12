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
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Find profiles with today's birthday
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, birth_date")
      .not("birth_date", "is", null);

    if (error) {
      console.error("[anniversaire] Error:", error);
      throw new Error("Erreur récupération profils");
    }

    // Filter profiles whose birth_date month-day matches today
    const birthdayProfiles = (profiles || []).filter(p => {
      if (!p.birth_date) return false;
      const bd = p.birth_date.slice(5); // MM-DD
      return bd === monthDay;
    });

    if (birthdayProfiles.length === 0) {
      console.log("[anniversaire] Aucun anniversaire aujourd'hui");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun anniversaire" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get emails for birthday users
    const userIds = birthdayProfiles.map(p => p.user_id);
    
    // Anti-doublon: check last 365 days
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentBirthday } = await supabase
      .from("email_audit_log")
      .select("user_id")
      .eq("type", "notification")
      .like("subject", "%anniversaire%")
      .gte("sent_at", oneYearAgo);

    const alreadySent = new Set(recentBirthday?.map(r => r.user_id) || []);

    const sender = EMAIL_SENDERS.contact;
    let sentCount = 0;
    const results: Array<{ name: string; status: string }> = [];

    for (const profile of birthdayProfiles) {
      if (alreadySent.has(profile.user_id)) {
        results.push({ name: profile.first_name || "Client", status: "skipped" });
        continue;
      }

      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!userData?.user?.email) {
        results.push({ name: profile.first_name || "Client", status: "no_email" });
        continue;
      }

      const firstName = profile.first_name || "cher cavalier";
      const age = profile.birth_date
        ? today.getFullYear() - new Date(profile.birth_date).getFullYear()
        : null;

      const bodyContent = [
        paragraph(`Bonjour ${firstName},`),
        `<div style="text-align:center;padding:30px 0;">
          <p style="font-size:48px;margin:0;">🎂</p>
          <h2 style="margin:10px 0;color:#6B8E7F;font-family:Georgia,serif;font-size:26px;">Joyeux Anniversaire${age ? ` – ${age} ans` : ""} !</h2>
        </div>`,
        paragraph("Toute l'équipe d'An Arwen vous souhaite une merveilleuse journée remplie de bonheur ! 🌿"),
        separator(),
        `<div style="background:linear-gradient(135deg,#F5F3F0,#FFF8E1);padding:25px;border-radius:12px;text-align:center;margin:20px 0;">
          <p style="margin:0 0 8px 0;font-size:16px;color:#333;font-family:Georgia,serif;">🎁 Cadeau d'anniversaire</p>
          <p style="margin:0 0 5px 0;font-size:28px;color:#6B8E7F;font-weight:bold;font-family:Georgia,serif;">-10%</p>
          <p style="margin:0;font-size:14px;color:#666;">sur votre prochaine réservation avec le code</p>
          <p style="margin:10px 0 0 0;font-size:20px;color:#C9896B;font-weight:bold;letter-spacing:2px;">ANNIV${today.getFullYear()}</p>
          <p style="margin:8px 0 0 0;font-size:12px;color:#888;">Valable 30 jours</p>
        </div>`,
        paragraph("Profitez de cette occasion pour vous offrir une nouvelle aventure équestre en Bretagne ou ailleurs ! 🐴"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("Joyeux Anniversaire ! 🎂", bodyContent, {
        preheader: `Joyeux anniversaire ${firstName} ! Un cadeau vous attend 🎁`,
        ctaUrl: `${appUrl}/destinations`,
        ctaLabel: "Découvrir nos séjours 🐎",
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: userData.user.email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🎂 Joyeux anniversaire ${firstName} ! Un cadeau vous attend`,
        html: htmlContent,
        type: "notification",
        userId: profile.user_id,
      });

      if (result.success) {
        sentCount++;
        results.push({ name: firstName, status: "sent" });
      } else {
        results.push({ name: firstName, status: `failed: ${result.error}` });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[anniversaire] ${sentCount} emails envoyés`);
    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: birthdayProfiles.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[anniversaire]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
