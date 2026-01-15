import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[notify-subscribers] No authorization header");
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
      console.error("[notify-subscribers] Invalid token:", authError?.message);
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
      console.error("[notify-subscribers] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[notify-subscribers] Authenticated admin: ${user.id}`);

    const { type, data }: NotifySubscribersRequest = await req.json();
    console.log(`[notify-subscribers] Received request type: ${type}`, data);

    // Fetch all newsletter subscribers
    const { data: subscribers, error: fetchError } = await supabase
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
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
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

    let subject = "";
    let htmlContent = "";
    const siteUrl = "https://an-arwen.fr";

    const activityTypeLabels: Record<string, string> = {
      randonnee: "Randonnée équestre",
      sejour: "Séjour à la ferme",
      stage: "Stage équitation",
      evenement: "Événement spécial",
    };

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

    // Send emails in batches
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < subscriberEmails.length; i += batchSize) {
      const batch = subscriberEmails.slice(i, i + batchSize);
      
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "An Arwen <newsletter@an-arwen.fr>",
          to: batch,
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[notify-subscribers] Batch ${i / batchSize + 1} error:`, errorText);
      } else {
        const emailResponse = await res.json();
        results.push(emailResponse);
        console.log(`[notify-subscribers] Batch ${i / batchSize + 1} sent:`, emailResponse);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscribersCount: subscriberEmails.length,
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

serve(handler);
