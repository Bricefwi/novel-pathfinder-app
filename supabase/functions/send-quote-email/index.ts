import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuoteEmailRequest {
  quote_number: string;
  client_name: string;
  client_email: string;
  activity_title: string;
  activity_duration?: string;
  start_date?: string;
  end_date?: string;
  participants: number;
  unit_price: number;
  total_price: number;
  deposit_amount: number;
  deposit_percentage: number;
  valid_until?: string;
  notes?: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "À définir";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-quote-email] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[send-quote-email] Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check admin role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roles) {
      console.error("[send-quote-email] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-quote-email] Authenticated admin: ${user.id}`);

    const quoteData: QuoteEmailRequest = await req.json();
    console.log("[send-quote-email] Sending to:", quoteData.client_email);

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre Devis - Ferme Équestre An Arwen</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F3F0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6B8E7F 0%, #8B7D6B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Ferme Équestre An Arwen</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre devis personnalisé</p>
            </td>
          </tr>
          
          <!-- Quote Number -->
          <tr>
            <td style="background-color: #6B8E7F; padding: 15px 30px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                Devis N° ${quoteData.quote_number}
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${quoteData.client_name}</strong>,
              </p>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px; line-height: 1.6;">
                Nous avons le plaisir de vous adresser votre devis pour la prestation suivante :
              </p>

              <!-- Activity Card -->
              <table role="presentation" style="width: 100%; background-color: #F5F3F0; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; font-weight: 600;">${quoteData.activity_title}</h2>
                    ${quoteData.activity_duration ? `<p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">📅 Durée : ${quoteData.activity_duration}</p>` : ""}
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">📆 Du ${formatDate(quoteData.start_date)} au ${formatDate(quoteData.end_date)}</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">👥 ${quoteData.participants} participant${quoteData.participants > 1 ? "s" : ""}</p>
                  </td>
                </tr>
              </table>

              <!-- Pricing -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Prix unitaire</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333; font-size: 14px; text-align: right;">${formatPrice(quoteData.unit_price)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Nombre de participants</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333; font-size: 14px; text-align: right;">${quoteData.participants}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; color: #333; font-size: 18px; font-weight: 600;">Total</td>
                  <td style="padding: 15px 0; color: #6B8E7F; font-size: 22px; font-weight: 700; text-align: right;">${formatPrice(quoteData.total_price)}</td>
                </tr>
              </table>

              <!-- Deposit Info -->
              <table role="presentation" style="width: 100%; background-color: #FFF8E1; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #C9B896;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 5px 0; color: #8B7D6B; font-size: 14px; font-weight: 600;">Acompte à verser (${quoteData.deposit_percentage}%)</p>
                    <p style="margin: 0; color: #8B7D6B; font-size: 24px; font-weight: 700;">${formatPrice(quoteData.deposit_amount)}</p>
                  </td>
                </tr>
              </table>

              ${quoteData.notes ? `
              <!-- Notes -->
              <table role="presentation" style="width: 100%; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #333; font-size: 14px; font-weight: 600;">Notes :</p>
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">${quoteData.notes}</p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Validity -->
              ${quoteData.valid_until ? `
              <p style="margin: 0 0 30px 0; color: #999; font-size: 13px; text-align: center;">
                Ce devis est valable jusqu'au <strong>${formatDate(quoteData.valid_until)}</strong>
              </p>
              ` : ""}

              <!-- CTA -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="https://novel-pathfinder-app.lovable.app/contact" style="display: inline-block; background-color: #6B8E7F; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Répondre à ce devis
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal Footer -->
          <tr>
            <td style="padding: 25px 30px; background-color: #f9f9f9; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; line-height: 1.5;">
                <strong>Conditions de réservation :</strong> En acceptant ce devis, vous acceptez nos <a href="https://novel-pathfinder-app.lovable.app/cgv" style="color: #6B8E7F;">Conditions Générales de Vente</a> et nos <a href="https://novel-pathfinder-app.lovable.app/cgu" style="color: #6B8E7F;">Conditions Générales d'Utilisation</a>.
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">
                L'acompte de ${quoteData.deposit_percentage}% est requis pour confirmer votre réservation. Le solde devra être réglé avant le départ.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #333; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px; font-weight: 600;">Ferme Équestre An Arwen</p>
              <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.7); font-size: 12px;">5 Le Bignon, 35360 La Chapelle du Lou du Lac</p>
              <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.7); font-size: 12px;">📞 02 99 06 68 68 | 📱 06 59 22 62 70</p>
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">✉️ contact@ferme-equestre-an-arwen.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ferme An Arwen <onboarding@resend.dev>",
        to: [quoteData.client_email],
        subject: `Votre devis ${quoteData.quote_number} - ${quoteData.activity_title}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[send-quote-email] Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResponse = await res.json();
    console.log("[send-quote-email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[send-quote-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
