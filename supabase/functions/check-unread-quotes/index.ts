import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

interface Quote {
  id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  activity_title: string;
  status: string;
  updated_at: string;
  validation_notification_sent: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  console.log("[check-unread-quotes] Starting scheduled check...");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const APP_URL = Deno.env.get("APP_URL") || "https://novel-pathfinder-app.lovable.app";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[check-unread-quotes] Missing Supabase credentials");
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!RESEND_API_KEY) {
    console.error("[check-unread-quotes] Missing RESEND_API_KEY");
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Create admin client with service role key for full access
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Calculate timestamp for 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Step 1: Find validated quotes older than 1 hour that haven't had notification sent
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from("quotes")
      .select("id, user_id, client_name, client_email, activity_title, status, updated_at, validation_notification_sent")
      .in("status", ["validated", "accepted", "signed"])
      .lt("updated_at", oneHourAgo)
      .eq("validation_notification_sent", false);

    if (quotesError) {
      console.error("[check-unread-quotes] Error fetching quotes:", quotesError);
      throw quotesError;
    }

    console.log(`[check-unread-quotes] Found ${quotes?.length || 0} quotes to process`);

    if (!quotes || quotes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No quotes to process",
          processed: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailsSent = 0;
    let skipped = 0;
    let errors = 0;

    // Step 2: Process each quote
    for (const quote of quotes) {
      try {
        let shouldSendEmail = true;

        // If quote has a user_id, check their last sign in
        if (quote.user_id) {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(quote.user_id);

          if (userError) {
            console.warn(`[check-unread-quotes] Could not fetch user ${quote.user_id}:`, userError);
            // Continue anyway, send the email
          } else if (userData?.user?.last_sign_in_at) {
            const lastSignIn = new Date(userData.user.last_sign_in_at);
            const quoteUpdated = new Date(quote.updated_at);

            // If user signed in AFTER the quote was updated, they've seen it
            if (lastSignIn > quoteUpdated) {
              console.log(`[check-unread-quotes] User ${quote.user_id} already signed in after validation, skipping email`);
              shouldSendEmail = false;

              // Mark as sent since user has seen it
              await supabaseAdmin
                .from("quotes")
                .update({ validation_notification_sent: true })
                .eq("id", quote.id);

              skipped++;
              continue;
            }
          }
        }

        // Step 3: Send email if needed using audited email system
        if (shouldSendEmail) {
          const emailHtml = buildReminderEmailHtml(quote, APP_URL);
          
          const result = await sendEmailWithAudit({
            supabase: supabaseAdmin,
            to: quote.client_email,
            from: "Rappels An Arwen <relance@ferme-equestre-arwen.com>",
            subject: `Bonne nouvelle ! Votre voyage en ${quote.activity_title} se concrétise 🐎`,
            html: emailHtml,
            type: "reminder",
            userId: quote.user_id || undefined,
            referenceId: quote.id,
          });

          if (result.success) {
            // Update the quote to mark notification as sent
            const { error: updateError } = await supabaseAdmin
              .from("quotes")
              .update({ validation_notification_sent: true })
              .eq("id", quote.id);

            if (updateError) {
              console.error(`[check-unread-quotes] Error updating quote ${quote.id}:`, updateError);
            } else {
              emailsSent++;
              console.log(`[check-unread-quotes] Quote ${quote.id} marked as notified`);
            }
          } else {
            console.error(`[check-unread-quotes] Failed to send email for quote ${quote.id}:`, result.error);
            errors++;
          }
        }
      } catch (quoteError) {
        console.error(`[check-unread-quotes] Error processing quote ${quote.id}:`, quoteError);
        errors++;
        // Continue with next quote
      }
    }

    const resultData = {
      success: true,
      message: `Processed ${quotes.length} quotes`,
      emailsSent,
      skipped,
      errors,
    };

    console.log("[check-unread-quotes] Completed:", resultData);

    return new Response(JSON.stringify(resultData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[check-unread-quotes] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

/**
 * Generates HTML content for the reminder email
 */
function buildReminderEmailHtml(quote: Quote, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre devis validé - Ferme Équestre An Arwen</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F3F0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🐎 Bonne nouvelle !</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre voyage se concrétise</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${quote.client_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 15px; line-height: 1.6;">
                Excellente nouvelle ! Votre devis pour <strong>${quote.activity_title}</strong> a été validé par notre équipe.
              </p>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px; line-height: 1.6;">
                Il ne vous reste plus qu'à vous connecter à votre espace personnel pour finaliser votre dossier et procéder au paiement de l'acompte.
              </p>

              <!-- Activity Card -->
              <table role="presentation" style="width: 100%; background-color: #F5F3F0; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <span style="display: inline-block; background-color: #6B8E7F; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">
                      ✅ Devis Validé
                    </span>
                    <h2 style="margin: 15px 0 0 0; color: #333; font-size: 20px; font-weight: 600;">${quote.activity_title}</h2>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/mon-espace" style="display: inline-block; background-color: #6B8E7F; color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Accéder à mon Espace
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #999; font-size: 13px; text-align: center;">
                Nous restons à votre disposition pour toute question.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #333; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px; font-weight: 600;">Ferme Équestre An Arwen</p>
              <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.7); font-size: 12px;">5 Le Bignon, 35360 La Chapelle du Lou du Lac</p>
              <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.7); font-size: 12px;">📞 02 99 06 68 68 | 📱 06 59 22 62 70</p>
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
}

serve(handler);
