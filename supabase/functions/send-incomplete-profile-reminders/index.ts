import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

/**
 * Edge function pour envoyer des rappels aux utilisateurs avec profil incomplet
 * Aligné avec la logique de profile-utils.ts (10 champs requis)
 */

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Authentification et vérification du rôle admin
    const auth = await authenticateRequest(req);
    if (!auth) {
      console.error("[send-incomplete-profile-reminders] Authentication failed");
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) {
      console.error("[send-incomplete-profile-reminders] User is not admin:", auth.user.id);
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    console.log(`[send-incomplete-profile-reminders] Authenticated admin: ${auth.user.id}`);

    // Créer un client service pour les opérations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer les profils incomplets avec les emails via get_user_emails_for_profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, phone, riding_level, riding_experience_years, dream_destinations, preferred_trip_types, interests, riding_style, travel_companions");

    if (profilesError) {
      console.error("[send-incomplete-profile-reminders] Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch profiles");
    }

    // Récupérer les emails des utilisateurs
    const { data: userEmails, error: emailsError } = await supabase
      .rpc("get_user_emails_for_profiles");

    if (emailsError) {
      console.error("[send-incomplete-profile-reminders] Error fetching emails:", emailsError);
      throw new Error("Failed to fetch user emails");
    }

    // Créer un map des emails par user_id
    const emailMap = new Map<string, string>();
    userEmails?.forEach((u: { user_id: string; email: string }) => {
      emailMap.set(u.user_id, u.email);
    });

    // Filtrer les profils incomplets selon la logique de profile-utils.ts
    const incompleteProfiles = profiles?.filter(profile => {
      const fields = [
        profile.first_name,
        profile.last_name,
        profile.phone,
        profile.riding_level,
        profile.riding_experience_years,
        (profile.dream_destinations?.length ?? 0) > 0,
        (profile.preferred_trip_types?.length ?? 0) > 0,
        (profile.interests?.length ?? 0) > 0,
        (profile.riding_style?.length ?? 0) > 0,
        profile.travel_companions,
      ];
      return fields.filter(Boolean).length < 10;
    }) || [];

    console.log(`[send-incomplete-profile-reminders] Found ${incompleteProfiles.length} incomplete profiles`);

    if (incompleteProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun profil incomplet trouvé", sent_count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const reminderSenderEmail = Deno.env.get("EMAIL_FROM_REMINDERS") || "An Arwen <relance@ferme-equestre-arwen.com>";
    const appUrl = Deno.env.get("APP_URL") || "https://novel-pathfinder-app.lovable.app";

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const profile of incompleteProfiles) {
      const email = emailMap.get(profile.user_id);
      if (!email) {
        console.warn(`[send-incomplete-profile-reminders] No email found for user_id: ${profile.user_id}`);
        continue;
      }

      // Calculer le pourcentage de complétion
      const fields = [
        profile.first_name,
        profile.last_name,
        profile.phone,
        profile.riding_level,
        profile.riding_experience_years,
        (profile.dream_destinations?.length ?? 0) > 0,
        (profile.preferred_trip_types?.length ?? 0) > 0,
        (profile.interests?.length ?? 0) > 0,
        (profile.riding_style?.length ?? 0) > 0,
        profile.travel_companions,
      ];
      const completionPercent = Math.round((fields.filter(Boolean).length / 10) * 100);
      const firstName = profile.first_name || "Cavalier";

      const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complétez votre profil - Ferme Équestre An Arwen</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F3F0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🐴 Ferme Équestre An Arwen</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre aventure équestre vous attend !</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 18px; line-height: 1.6;">
                Bonjour <strong>${firstName}</strong> 👋
              </p>
              <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.6;">
                Nous avons remarqué que votre profil cavalier n'est pas encore complet. En le finalisant, vous pourrez :
              </p>

              <!-- Benefits -->
              <table role="presentation" style="width: 100%; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 12px 15px; background-color: #F5F3F0; border-radius: 8px; margin-bottom: 10px;">
                    <span style="color: #6B8E7F; font-size: 16px;">✓</span>
                    <span style="color: #333; font-size: 14px; margin-left: 10px;">Recevoir des recommandations personnalisées</span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #F5F3F0; border-radius: 8px;">
                    <span style="color: #6B8E7F; font-size: 16px;">✓</span>
                    <span style="color: #333; font-size: 14px; margin-left: 10px;">Obtenir le badge "Cavalier Vérifié"</span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #F5F3F0; border-radius: 8px;">
                    <span style="color: #6B8E7F; font-size: 16px;">✓</span>
                    <span style="color: #333; font-size: 14px; margin-left: 10px;">Accéder aux offres exclusives VIP</span>
                  </td>
                </tr>
              </table>

              <!-- Progress -->
              <table role="presentation" style="width: 100%; background-color: #FFF8E1; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #C9B896;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #8B7D6B; font-size: 14px;">Votre profil est complété à</p>
                    <p style="margin: 0; color: #8B7D6B; font-size: 32px; font-weight: 700;">${completionPercent}%</p>
                    <p style="margin: 10px 0 0 0; color: #8B7D6B; font-size: 13px;">Plus que quelques informations pour atteindre 100% !</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/onboarding" style="display: inline-block; background-color: #6B8E7F; color: #ffffff; text-decoration: none; padding: 16px 45px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Compléter mon profil
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #333; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px; font-weight: 600;">Ferme Équestre An Arwen</p>
              <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.7); font-size: 12px;">5 Le Bignon, 35360 La Chapelle du Lou du Lac</p>
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">✉️ contact@ferme-equestre-arwen.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const result = await sendEmailWithAudit({
        supabase,
        to: email,
        from: reminderSenderEmail,
        subject: `${firstName}, complétez votre profil cavalier (${completionPercent}%)`,
        html: emailHtml,
        type: "reminder",
        userId: profile.user_id,
      });

      if (result.success) {
        successCount++;
        console.log(`[send-incomplete-profile-reminders] Sent to ${email}`);
      } else {
        failureCount++;
        errors.push(`${email}: ${result.error}`);
        console.error(`[send-incomplete-profile-reminders] Failed for ${email}:`, result.error);
      }

      // Petite pause pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[send-incomplete-profile-reminders] Completed: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: successCount,
        failed_count: failureCount,
        total_incomplete: incompleteProfiles.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-incomplete-profile-reminders] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
