import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, infoCard,
} from "../_shared/email-templates.ts";

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) return createAuthErrorResponse("Authentication required", 401, corsHeaders);

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) return createAuthErrorResponse("Admin access required", 403, corsHeaders);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, phone, riding_level, riding_experience_years, dream_destinations, preferred_trip_types, interests, riding_style, travel_companions")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get email
    const { data: userEmails } = await supabase.rpc("get_user_emails_for_profiles");
    const emailMap = new Map<string, string>();
    userEmails?.forEach((u: { user_id: string; email: string }) => emailMap.set(u.user_id, u.email));
    const email = emailMap.get(user_id);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email not found for user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check completion
    const fields = [
      !!profile.first_name, !!profile.last_name, !!profile.phone,
      !!profile.riding_level,
      profile.riding_experience_years !== null && profile.riding_experience_years !== undefined,
      (profile.dream_destinations?.length ?? 0) > 0,
      (profile.preferred_trip_types?.length ?? 0) > 0,
      (profile.interests?.length ?? 0) > 0,
      (profile.riding_style?.length ?? 0) > 0,
      !!profile.travel_companions,
    ];
    const completionPercent = Math.round((fields.filter(Boolean).length / 10) * 100);

    if (completionPercent === 100) {
      return new Response(
        JSON.stringify({ success: true, message: "Profil déjà complet", completion: 100 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const firstName = profile.first_name || "Cavalier";
    const appUrl = getAppUrl();

    const benefitRow = (text: string) => `
      <tr><td style="padding:10px 15px;background-color:#F5F3F0;border-radius:8px;">
        <span style="color:#6B8E7F;font-size:16px;">✓</span>
        <span style="color:#333;font-size:14px;margin-left:10px;">${text}</span>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
    `;

    const body = [
      greeting(`${firstName} 👋`),
      paragraph("Nous avons remarqué que votre profil cavalier n'est pas encore complet. En le finalisant, vous pourrez bénéficier de tous les avantages de votre espace personnel :"),
      `<table role="presentation" style="width:100%;margin:20px 0;">
        ${benefitRow("Recevoir des recommandations personnalisées")}
        ${benefitRow("Obtenir le badge « Cavalier Vérifié »")}
        ${benefitRow("Accéder aux offres exclusives")}
      </table>`,
      infoCard(`
        <p style="margin:0 0 8px 0;color:#8B7D6B;font-size:14px;">Votre profil est complété à</p>
        <p style="margin:0;color:#8B7D6B;font-size:36px;font-weight:700;font-family:Georgia,serif;">${completionPercent}%</p>
        <p style="margin:8px 0 0 0;color:#8B7D6B;font-size:13px;">Plus que quelques informations pour atteindre 100 % !</p>
      `),
    ].join("");

    const emailHtml = wrapInBrandedLayout("Complétez votre profil cavalier", body, {
      preheader: `${firstName}, votre profil est à ${completionPercent}% – finalisez-le en 2 minutes !`,
      ctaUrl: `${appUrl}/onboarding`,
      ctaLabel: "Compléter mon profil",
    });

    const sender = EMAIL_SENDERS.relance;
    const result = await sendEmailWithAudit({
      supabase,
      to: email,
      from: `${sender.name} <${sender.email}>`,
      subject: `${firstName}, complétez votre profil cavalier (${completionPercent}%)`,
      html: emailHtml,
      type: "reminder",
      userId: user_id,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, completion: completionPercent, email_sent_to: email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-single-profile-reminder] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
