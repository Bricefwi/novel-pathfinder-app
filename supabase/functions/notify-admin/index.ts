import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "contact@an-arwen.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminRequest {
  type: "devis" | "disponibilite" | "contact" | "reservation";
  data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message?: string;
    date?: string;
    activityTitle?: string;
    accommodationName?: string;
    participants?: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[notify-admin] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[notify-admin] Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[notify-admin] Authenticated user: ${user.id}`);

    const { type, data }: NotifyAdminRequest = await req.json();
    console.log(`[notify-admin] Received request type: ${type}`, data);

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "devis":
        subject = `📋 Nouvelle demande de devis de ${data.name}`;
        htmlContent = `
          <h1>Nouvelle demande de devis</h1>
          <h2>Coordonnées</h2>
          <ul>
            <li><strong>Nom:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            ${data.phone ? `<li><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
            ${data.participants ? `<li><strong>Participants:</strong> ${data.participants}</li>` : ""}
          </ul>
          ${data.subject ? `<h2>Sujet</h2><p>${data.subject}</p>` : ""}
          ${data.message ? `<h2>Détails de la demande</h2><pre style="background:#f4f4f4;padding:15px;border-radius:5px;white-space:pre-wrap;">${data.message}</pre>` : ""}
          <hr>
          <p style="color:#888;font-size:12px;">Email envoyé automatiquement depuis le site An Arwen</p>
        `;
        break;

      case "disponibilite":
        subject = `📅 Demande de disponibilité - ${data.activityTitle || data.accommodationName || "Hébergement"}`;
        htmlContent = `
          <h1>Demande de disponibilité</h1>
          <h2>Demandeur</h2>
          <ul>
            <li><strong>Nom:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            ${data.phone ? `<li><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
          </ul>
          <h2>Détails</h2>
          <ul>
            ${data.date ? `<li><strong>Date demandée:</strong> ${data.date}</li>` : ""}
            ${data.activityTitle ? `<li><strong>Activité:</strong> ${data.activityTitle}</li>` : ""}
            ${data.accommodationName ? `<li><strong>Hébergement:</strong> ${data.accommodationName}</li>` : ""}
            ${data.participants ? `<li><strong>Participants:</strong> ${data.participants}</li>` : ""}
          </ul>
          ${data.message ? `<h2>Message</h2><p>${data.message}</p>` : ""}
          <hr>
          <p style="color:#888;font-size:12px;">Email envoyé automatiquement depuis le site An Arwen</p>
        `;
        break;

      case "reservation":
        subject = `🐴 Nouvelle réservation de ${data.name}`;
        htmlContent = `
          <h1>Nouvelle réservation</h1>
          <h2>Client</h2>
          <ul>
            <li><strong>Nom:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            ${data.phone ? `<li><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
          </ul>
          <h2>Réservation</h2>
          <ul>
            ${data.date ? `<li><strong>Date:</strong> ${data.date}</li>` : ""}
            ${data.activityTitle ? `<li><strong>Activité:</strong> ${data.activityTitle}</li>` : ""}
            ${data.accommodationName ? `<li><strong>Hébergement:</strong> ${data.accommodationName}</li>` : ""}
            ${data.participants ? `<li><strong>Participants:</strong> ${data.participants}</li>` : ""}
          </ul>
          ${data.message ? `<h2>Notes</h2><p>${data.message}</p>` : ""}
          <hr>
          <p style="color:#888;font-size:12px;">Email envoyé automatiquement depuis le site An Arwen</p>
        `;
        break;

      case "contact":
      default:
        subject = `✉️ Nouveau message de ${data.name}`;
        htmlContent = `
          <h1>Nouveau message de contact</h1>
          <ul>
            <li><strong>Nom:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            ${data.phone ? `<li><strong>Téléphone:</strong> ${data.phone}</li>` : ""}
          </ul>
          ${data.subject ? `<h2>Sujet: ${data.subject}</h2>` : ""}
          ${data.message ? `<h2>Message</h2><p>${data.message}</p>` : ""}
          <hr>
          <p style="color:#888;font-size:12px;">Email envoyé automatiquement depuis le site An Arwen</p>
        `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "An Arwen <notifications@an-arwen.fr>",
        to: [ADMIN_EMAIL],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[notify-admin] Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResponse = await res.json();
    console.log("[notify-admin] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[notify-admin] Error:", error);
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
