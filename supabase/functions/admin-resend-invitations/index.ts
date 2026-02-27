import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    if (!(await verifyAdminRole(auth.supabase, auth.user.id))) {
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    const { emails, resend_all } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const siteUrl = Deno.env.get("SITE_URL") || "https://ferme-equestre-arwen.com";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    let targetEmails: string[] = [];

    if (resend_all) {
      const allUsers: any[] = [];
      let page = 1;
      while (true) {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        if (!users || users.length === 0) break;
        allUsers.push(...users);
        if (users.length < 1000) break;
        page++;
      }

      targetEmails = allUsers
        .filter((u) => {
          const emailNotConfirmed = !u.email_confirmed_at;
          const neverSignedIn = !u.last_sign_in_at;
          const hasNoPassword = !u.encrypted_password || u.encrypted_password === "";
          return (emailNotConfirmed && neverSignedIn) || hasNoPassword || (u.invited_at && neverSignedIn);
        })
        .map((u) => u.email)
        .filter((e): e is string => !!e && !e.includes("@placeholder.local"));
    } else if (Array.isArray(emails) && emails.length > 0) {
      targetEmails = emails.filter((e: string) => e && !e.includes("@placeholder.local"));
    } else {
      return new Response(
        JSON.stringify({ error: "Fournissez 'emails' (array) ou 'resend_all: true'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: max 10 per call
    if (targetEmails.length > 10) {
      targetEmails = targetEmails.slice(0, 10);
    }

    // Pre-fetch all users once to avoid repeated listUsers calls
    const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const usersMap = new Map((allAuthUsers || []).map(u => [u.email, u]));

    const results = { success: [] as string[], failed: [] as { email: string; error: string }[], total_processed: 0 };

    for (const email of targetEmails) {
      try {
        const user = usersMap.get(email);

        if (!user) {
          results.failed.push({ email, error: "Utilisateur non trouvé" });
          results.total_processed++;
          continue;
        }

        // Confirm email first if not confirmed
        if (!user.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUser(user.id, {
            email_confirm: true,
          });
        }

        // Generate a recovery link (bypasses rate limit on resetPasswordForEmail)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${siteUrl}/auth?reset=true`,
          },
        });

        if (linkError) throw linkError;

        const actionLink = linkData?.properties?.action_link;
        if (!actionLink) throw new Error("Impossible de générer le lien de récupération");

        // Send email via Resend
        if (resendApiKey) {
          const firstName = user.user_metadata?.first_name || email.split("@")[0];
          
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Ferme Equestre An Arwen <noreply@ferme-equestre-arwen.com>",
              to: [email],
              subject: "Activez votre compte – Ferme Équestre An Arwen",
              html: `
                <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #d4652a; font-family: 'Libre Caslon Text', Georgia, serif; font-size: 24px;">
                      Ferme Équestre An Arwen
                    </h1>
                  </div>
                  <p style="font-size: 16px; color: #333;">Bonjour ${firstName},</p>
                  <p style="font-size: 15px; color: #555; line-height: 1.6;">
                    Votre compte a été créé sur notre plateforme. Pour l'activer, veuillez cliquer sur le bouton ci-dessous 
                    afin de définir votre mot de passe :
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${actionLink}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #d4652a; color: #ffffff; 
                              text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Définir mon mot de passe
                    </a>
                  </div>
                  <p style="font-size: 13px; color: #999; line-height: 1.5;">
                    Ce lien est valable 24 heures. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="font-size: 12px; color: #aaa; text-align: center;">
                    Ferme Équestre An Arwen – Brocéliande, Bretagne
                  </p>
                </div>
              `,
            }),
          });

          if (!emailRes.ok) {
            const errBody = await emailRes.text();
            throw new Error(`Erreur envoi email: ${errBody}`);
          }
        } else {
          // Fallback: use Supabase's built-in reset (may hit rate limit)
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/auth?reset=true`,
          });
          if (resetError) throw resetError;
        }

        results.success.push(email);
      } catch (err: any) {
        results.failed.push({ email, error: err.message });
      }
      results.total_processed++;
    }

    // Log action
    await supabaseAdmin.from("security_audit_log").insert({
      action_type: "BULK_REINVITATION",
      performed_by: auth.user.id,
      metadata: {
        success_count: results.success.length,
        failed_count: results.failed.length,
        emails_processed: results.success,
      },
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[admin-resend-invitations] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
