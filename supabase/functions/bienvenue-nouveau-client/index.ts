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

    // Find profiles created in the last 24h that haven't received a welcome email
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: newProfiles, error } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, created_at")
      .gte("created_at", oneDayAgo);

    if (error) {
      console.error("[bienvenue] Error:", error);
      throw new Error("Erreur récupération nouveaux profils");
    }

    if (!newProfiles || newProfiles.length === 0) {
      console.log("[bienvenue] Aucun nouveau client");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun nouveau client" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-doublon
    const userIds = newProfiles.map(p => p.user_id);
    const { data: alreadyWelcomed } = await supabase
      .from("email_audit_log")
      .select("user_id")
      .eq("type", "notification")
      .like("subject", "%bienvenue%")
      .in("user_id", userIds);

    const alreadySent = new Set(alreadyWelcomed?.map(r => r.user_id) || []);

    // Notify admin
    const adminEmails = Deno.env.get("ADMIN_NOTIFICATION_EMAILS");

    const sender = EMAIL_SENDERS.contact;
    let sentCount = 0;
    const results: Array<{ name: string; status: string }> = [];

    for (const profile of newProfiles) {
      if (alreadySent.has(profile.user_id)) {
        results.push({ name: profile.first_name || "Client", status: "skipped" });
        continue;
      }

      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!userData?.user?.email) {
        results.push({ name: profile.first_name || "Client", status: "no_email" });
        continue;
      }

      const firstName = profile.first_name || "cher cavalier";

      const bodyContent = [
        paragraph(`Bonjour ${firstName},`),
        `<div style="text-align:center;padding:20px 0;">
          <p style="font-size:42px;margin:0;">🐴</p>
          <h2 style="margin:10px 0;color:#6B8E7F;font-family:Georgia,serif;font-size:22px;">Bienvenue dans la famille An Arwen !</h2>
        </div>`,
        paragraph("Nous sommes ravis de vous compter parmi nos cavaliers ! Votre aventure équestre commence ici. 🌿"),
        separator(),
        `<div style="background:#F5F3F0;padding:20px;border-radius:12px;margin:20px 0;">
          <h3 style="margin:0 0 15px 0;font-family:Georgia,serif;color:#333;font-size:16px;">🗺️ Prochaines étapes :</h3>
          <p style="margin:6px 0;font-size:14px;color:#555;">1️⃣ <strong>Complétez votre profil</strong> pour des recommandations personnalisées</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">2️⃣ <strong>Découvrez nos destinations</strong> en Bretagne, au Maroc et ailleurs</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">3️⃣ <strong>Demandez un devis</strong> pour votre prochain séjour équestre</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">4️⃣ <strong>Rejoignez notre newsletter</strong> pour les bons plans 🐎</p>
        </div>`,
        paragraph("N'hésitez pas à nous contacter pour toute question. On a hâte de vous accueillir !"),
        paragraph("À très bientôt en selle,<br><strong>L'équipe An Arwen</strong> 🌿"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("Bienvenue ! 🐴", bodyContent, {
        preheader: `Bienvenue ${firstName} ! Votre aventure équestre commence`,
        ctaUrl: `${appUrl}/onboarding`,
        ctaLabel: "Compléter mon profil 🎯",
      });

      const result = await sendEmailWithAudit({
        supabase,
        to: userData.user.email,
        from: `${sender.name} <${sender.email}>`,
        subject: `🐴 Bienvenue ${firstName} – Votre aventure An Arwen commence !`,
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

      // Admin notification
      if (adminEmails && result.success) {
        const adminBody = paragraph(`Nouveau client inscrit : <strong>${firstName} ${profile.last_name || ""}</strong> (${userData.user.email})`);
        const adminHtml = wrapInBrandedLayout("Nouveau client", adminBody, {
          ctaUrl: `${appUrl}/admin`,
          ctaLabel: "Voir dans l'admin",
        });
        
        for (const adminEmail of adminEmails.split(",").map(e => e.trim())) {
          await sendEmailWithAudit({
            supabase,
            to: adminEmail,
            from: `${EMAIL_SENDERS.notifications.name} <${EMAIL_SENDERS.notifications.email}>`,
            subject: `👤 Nouveau client : ${firstName} ${profile.last_name || ""}`,
            html: adminHtml,
            type: "alert",
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[bienvenue] ${sentCount} emails envoyés`);
    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: newProfiles.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[bienvenue]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
