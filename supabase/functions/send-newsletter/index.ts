import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout,
} from "../_shared/email-templates.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, content, testEmail }: NewsletterRequest = await req.json();

    if (!BREVO_API_KEY) {
      console.error("[send-newsletter] BREVO_API_KEY is missing");
      throw new Error("La clé API BREVO_API_KEY est manquante.");
    }

    if (!subject || !content) {
      throw new Error("Le sujet et le contenu sont requis");
    }

    const to = testEmail
      ? [{ email: testEmail }]
      : [{ email: "ferme.equestre.arwen@gmail.com" }];

    console.log(`[send-newsletter] Envoi email via Brevo à : ${to.map(t => t.email).join(", ")}`);

    // Wrap the content in the branded layout
    const htmlContent = wrapInBrandedLayout("Newsletter", content, {
      preheader: subject,
      unsubscribeUrl: `${Deno.env.get("APP_URL") || "https://ferme-equestre-arwen.com"}/mon-espace`,
    });

    const sender = EMAIL_SENDERS.newsletter;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to,
        subject,
        htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-newsletter] Erreur Brevo:", data);
      throw new Error(data.message || `Erreur Brevo (${res.status})`);
    }

    console.log("[send-newsletter] Email envoyé avec succès via Brevo:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[send-newsletter] Erreur:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
