import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { logEmailAudit, EmailType } from "../_shared/email-audit.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotifySubscribersRequest {
  type: "nouvelle_activite" | "nouveau_sejour" | "nouvel_article";
  data: {
    title: string;
    description?: string;
    activityType?: string;
    location?: string;
    startDate?: string;
    price?: number;
    imageUrl?: string;
  };
}

const activityTypeLabels: Record<string, string> = {
  randonnee: "Randonnée équestre",
  sejour: "Séjour à la ferme",
  stage: "Stage équitation",
  evenement: "Événement spécial",
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // SECURITY: Verify authentication and admin role
    const auth = await authenticateRequest(req);
    if (!auth) {
      console.error("[notify-subscribers] Authentication failed");
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    // Check admin role
    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) {
      console.error("[notify-subscribers] User is not admin:", auth.user.id);
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    console.log(`[notify-subscribers] Authenticated admin: ${auth.user.id}`);

    // Create service client for admin operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, data }: NotifySubscribersRequest = await req.json();
    console.log(`[notify-subscribers] Received request type: ${type}`, data);

    // Fetch all newsletter subscribers
    const { data: subscribers, error: fetchError } = await supabaseService
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("newsletter_subscribed", true);

    if (fetchError) {
      console.error("[notify-subscribers] Error fetching subscribers:", fetchError);
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("[notify-subscribers] No subscribers found");
      return new Response(JSON.stringify({ success: true, message: "No subscribers" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get emails from auth.users for each subscriber
    const { data: usersData, error: usersError } = await supabaseService.auth.admin.listUsers();
    
    if (usersError) {
      console.error("[notify-subscribers] Error fetching users:", usersError);
      throw usersError;
    }

    const subscriberEmails = subscribers
      .map(sub => {
        const user = usersData.users.find(u => u.id === sub.user_id);
        return user?.email;
      })
      .filter(Boolean) as string[];

    if (subscriberEmails.length === 0) {
      console.log("[notify-subscribers] No valid emails found");
      return new Response(JSON.stringify({ success: true, message: "No valid emails" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[notify-subscribers] Sending to ${subscriberEmails.length} subscribers`);

    // Get configured URLs
    const siteUrl = Deno.env.get("APP_URL") || "https://novel-pathfinder-app.lovable.app";
    const senderEmail = "Newsletter An Arwen <newsletter@ferme-equestre-arwen.com>";

    // Build email content
    const { subject, htmlContent } = buildEmailContent(type, data, siteUrl);

    // Send emails in batches
    const batchSize = 50;
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < subscriberEmails.length; i += batchSize) {
      const batch = subscriberEmails.slice(i, i + batchSize);
      
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: senderEmail,
            to: batch,
            subject: subject,
            html: htmlContent,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[notify-subscribers] Batch ${i / batchSize + 1} error:`, errorText);
          
          // Log failed emails for audit
          for (const email of batch) {
            await logEmailAudit(supabaseService, {
              recipient: email,
              type: "newsletter" as EmailType,
              subject: subject,
              status: "failed",
              error_message: errorText,
            });
          }
          errorCount += batch.length;
        } else {
          const emailResponse = await res.json();
          results.push(emailResponse);
          console.log(`[notify-subscribers] Batch ${i / batchSize + 1} sent:`, emailResponse);
          
          // Log successful emails for audit
          for (const email of batch) {
            await logEmailAudit(supabaseService, {
              recipient: email,
              type: "newsletter" as EmailType,
              subject: subject,
              status: "sent",
            });
          }
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error(`[notify-subscribers] Batch ${i / batchSize + 1} exception:`, batchError);
        errorCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscribersCount: subscriberEmails.length,
        successCount,
        errorCount,
        results 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[notify-subscribers] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

/**
 * Builds email subject and HTML content based on notification type
 */
function buildEmailContent(
  type: NotifySubscribersRequest["type"], 
  data: NotifySubscribersRequest["data"],
  siteUrl: string
): { subject: string; htmlContent: string } {
  let subject = "";
  let htmlContent = "";

  switch (type) {
    case "nouvelle_activite":
    case "nouveau_sejour":
      const typeLabel = activityTypeLabels[data.activityType || ""] || "Nouvelle activité";
      subject = `🐴 ${typeLabel} : ${data.title}`;
      htmlContent = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5B4F 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">An Arwen</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Ferme Équestre</p>
          </div>
          
          <div style="padding: 30px; background: #FDFBF7;">
            <h2 style="color: #4A4039; margin-top: 0;">${typeLabel}</h2>
            <h3 style="color: #8B7355; font-size: 24px;">${data.title}</h3>
            
            ${data.description ? `<p style="color: #666; line-height: 1.6;">${data.description}</p>` : ""}
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B7355;">
              ${data.location ? `<p style="margin: 5px 0;"><strong>📍 Lieu :</strong> ${data.location}</p>` : ""}
              ${data.startDate ? `<p style="margin: 5px 0;"><strong>📅 Date :</strong> ${data.startDate}</p>` : ""}
              ${data.price ? `<p style="margin: 5px 0;"><strong>💶 À partir de :</strong> ${data.price}€</p>` : ""}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/planning" style="display: inline-block; background: #8B7355; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Voir les disponibilités
              </a>
            </div>
          </div>
          
          <div style="background: #4A4039; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">
              Vous recevez cet email car vous êtes abonné(e) à la newsletter An Arwen.
            </p>
            <a href="${siteUrl}/mon-espace" style="color: #D4C4B0; font-size: 12px;">
              Gérer mes préférences
            </a>
          </div>
        </div>
      `;
      break;

    case "nouvel_article":
      subject = `📖 Nouveau sur le Carnet de Voyage : ${data.title}`;
      htmlContent = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5B4F 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">An Arwen</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Carnet de Voyage</p>
          </div>
          
          <div style="padding: 30px; background: #FDFBF7;">
            <h2 style="color: #8B7355; font-size: 24px; margin-top: 0;">${data.title}</h2>
            ${data.description ? `<p style="color: #666; line-height: 1.6;">${data.description}</p>` : ""}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/carnet-de-voyage" style="display: inline-block; background: #8B7355; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Lire l'article
              </a>
            </div>
          </div>
          
          <div style="background: #4A4039; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">
              Vous recevez cet email car vous êtes abonné(e) à la newsletter An Arwen.
            </p>
            <a href="${siteUrl}/mon-espace" style="color: #D4C4B0; font-size: 12px;">
              Gérer mes préférences
            </a>
          </div>
        </div>
      `;
      break;
  }

  return { subject, htmlContent };
}

serve(handler);
