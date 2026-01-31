import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsletterRequest {
  subject: string;
  content: string;
  testEmail?: string;
}

serve(async (req) => {
  // 1. Gérer les requêtes préliminaires (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, content, testEmail }: NewsletterRequest = await req.json();

    if (!RESEND_API_KEY) {
      console.error("[send-newsletter] RESEND_API_KEY is missing");
      throw new Error("La clé API RESEND_API_KEY est manquante dans Supabase.");
    }

    if (!subject || !content) {
      throw new Error("Le sujet et le contenu sont requis");
    }

    // 2. Définir les destinataires
    // Si c'est un test, on envoie seulement à l'email indiqué.
    // Sinon, on met l'admin en copie
    const to = testEmail ? [testEmail] : ["ferme.equestre.arwen@gmail.com"];
    console.log(`[send-newsletter] Envoi email à : ${to.join(", ")}`);

    // 3. Appel direct à l'API Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ferme Arwen <newsletter@ferme-equestre-arwen.com>",
        to: to,
        subject: subject,
        html: content,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("[send-newsletter] Erreur Resend:", data);
      throw new Error(data.message || "Erreur lors de l'envoi Resend");
    }

    console.log("[send-newsletter] Email envoyé avec succès:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[send-newsletter] Erreur Function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
