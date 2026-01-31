import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

interface InvoiceEmailRequest {
  invoice_id: string;
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
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Cette fonction est appelée par un webhook, donc on utilise le service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { invoice_id }: InvoiceEmailRequest = await req.json();
    
    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: "invoice_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-invoice-email] Processing invoice:", invoice_id);

    // Récupérer les détails de la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();
    
    // Valider l'email destinataire
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (invoice && !emailRegex.test(invoice.client_email)) {
      console.error("[send-invoice-email] Invalid email format:", invoice.client_email);
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (invoiceError || !invoice) {
      console.error("[send-invoice-email] Invoice not found:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Utiliser le domaine vérifié ferme-equestre-arwen.com
    const systemSenderEmail = Deno.env.get("EMAIL_FROM_INVOICES") || "Factures An Arwen <factures@ferme-equestre-arwen.com>";
    const appUrl = Deno.env.get("APP_URL") || "https://novel-pathfinder-app.lovable.app";
    
    console.log("[send-invoice-email] Using sender:", systemSenderEmail, "to:", invoice.client_email);

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre Facture - Ferme Équestre An Arwen</title>
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
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre facture</p>
            </td>
          </tr>
          
          <!-- Invoice Number -->
          <tr>
            <td style="background-color: #6B8E7F; padding: 15px 30px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                Facture N° ${invoice.invoice_number}
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${invoice.client_name}</strong>,
              </p>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px; line-height: 1.6;">
                Veuillez trouver ci-dessous votre facture pour la prestation suivante :
              </p>

              <!-- Activity Card -->
              <table role="presentation" style="width: 100%; background-color: #F5F3F0; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; font-weight: 600;">${invoice.activity_title}</h2>
                    ${invoice.activity_duration ? `<p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">📅 Durée : ${invoice.activity_duration}</p>` : ""}
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">📆 Du ${formatDate(invoice.start_date)} au ${formatDate(invoice.end_date)}</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">👥 ${invoice.participants} participant${invoice.participants > 1 ? "s" : ""}</p>
                  </td>
                </tr>
              </table>

              <!-- Pricing -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Sous-total HT</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333; font-size: 14px; text-align: right;">${formatPrice(invoice.subtotal)}</td>
                </tr>
                ${invoice.tax_amount > 0 ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">TVA (${invoice.tax_rate || 20}%)</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333; font-size: 14px; text-align: right;">${formatPrice(invoice.tax_amount)}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 15px 0; color: #333; font-size: 18px; font-weight: 600;">Total TTC</td>
                  <td style="padding: 15px 0; color: #6B8E7F; font-size: 22px; font-weight: 700; text-align: right;">${formatPrice(invoice.total_amount)}</td>
                </tr>
              </table>

              <!-- Payment Status -->
              <table role="presentation" style="width: 100%; background-color: ${invoice.payment_status === 'paid' ? '#E8F5E9' : '#FFF8E1'}; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid ${invoice.payment_status === 'paid' ? '#4CAF50' : '#C9B896'};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 5px 0; color: ${invoice.payment_status === 'paid' ? '#2E7D32' : '#8B7D6B'}; font-size: 14px; font-weight: 600;">
                      ${invoice.payment_status === 'paid' ? '✅ Facture payée' : '⏳ En attente de paiement'}
                    </p>
                    ${invoice.due_date && invoice.payment_status !== 'paid' ? `
                    <p style="margin: 0; color: #8B7D6B; font-size: 14px;">Date d'échéance : <strong>${formatDate(invoice.due_date)}</strong></p>
                    ` : ""}
                    ${invoice.amount_paid && invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_amount ? `
                    <p style="margin: 5px 0 0 0; color: #8B7D6B; font-size: 14px;">Montant déjà versé : ${formatPrice(invoice.amount_paid)}</p>
                    <p style="margin: 5px 0 0 0; color: #8B7D6B; font-size: 16px; font-weight: 600;">Reste à payer : ${formatPrice(invoice.total_amount - invoice.amount_paid)}</p>
                    ` : ""}
                  </td>
                </tr>
              </table>

              ${invoice.notes ? `
              <!-- Notes -->
              <table role="presentation" style="width: 100%; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #333; font-size: 14px; font-weight: 600;">Notes :</p>
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">${invoice.notes}</p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- CTA -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/mon-espace" style="display: inline-block; background-color: #6B8E7F; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Voir ma facture dans Mon Espace
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
                <strong>Mentions légales :</strong> Ferme Équestre An Arwen - SIRET 520 388 741 00017<br>
                TVA non applicable, art. 293 B du CGI (si applicable)
              </p>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 11px; line-height: 1.5;">
                <strong>Conditions de paiement :</strong> Paiement à réception de facture. En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement.
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

    // Envoyer l'email avec audit
    const result = await sendEmailWithAudit({
      supabase,
      to: invoice.client_email,
      from: systemSenderEmail,
      subject: `Facture ${invoice.invoice_number} - ${invoice.activity_title}`,
      html: emailHtml,
      type: "invoice",
      userId: invoice.user_id,
      referenceId: invoice.id,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log("[send-invoice-email] Email sent successfully to:", invoice.client_email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-invoice-email] Error:", errorMessage);
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
