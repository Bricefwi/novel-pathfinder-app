import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EMAIL_SENDERS, wrapInBrandedLayout,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const appUrl = Deno.env.get("APP_URL") || "https://ferme-equestre-arwen.com";

    // Wrap the content in the branded layout
    const htmlContent = wrapInBrandedLayout("Newsletter", content, {
      preheader: subject,
      unsubscribeUrl: `${appUrl}/mon-espace`,
    });

    const sender = EMAIL_SENDERS.newsletter;

    // ── TEST MODE: send to a single test email ──
    if (testEmail) {
      console.log(`[send-newsletter] Mode test → envoi à : ${testEmail}`);

      const result = await sendEmailWithAudit({
        supabase,
        to: testEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
        type: "newsletter",
      });

      if (!result.success) throw new Error(result.error);

      return new Response(JSON.stringify({ success: true, sent: 1, mode: "test" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── PRODUCTION MODE: fetch all active subscribers ──
    const { data: subscribers, error: fetchError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);

    if (fetchError) {
      console.error("[send-newsletter] Error fetching subscribers:", fetchError);
      throw new Error("Impossible de récupérer les abonnés");
    }

    // Also include profiles that opted in to newsletter
    const { data: profileSubscribers } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("newsletter_subscribed", true);

    // Get emails for profile subscribers
    let profileEmails: string[] = [];
    if (profileSubscribers && profileSubscribers.length > 0) {
      const { data: userEmails } = await supabase
        .rpc("get_user_emails_for_profiles");
      
      if (userEmails) {
        const subscribedUserIds = new Set(profileSubscribers.map(p => p.user_id));
        profileEmails = userEmails
          .filter((u: { user_id: string; email: string }) => subscribedUserIds.has(u.user_id))
          .map((u: { user_id: string; email: string }) => u.email);
      }
    }

    // Merge and deduplicate all recipient emails
    const allEmails = new Set<string>();
    subscribers?.forEach(s => allEmails.add(s.email.toLowerCase()));
    profileEmails.forEach(e => allEmails.add(e.toLowerCase()));

    const recipientList = Array.from(allEmails);

    if (recipientList.length === 0) {
      console.warn("[send-newsletter] Aucun abonné actif trouvé");
      return new Response(
        JSON.stringify({ success: false, error: "Aucun abonné actif. Ajoutez des abonnés depuis le CRM ou via le formulaire newsletter du site." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[send-newsletter] Envoi à ${recipientList.length} abonnés`);

    // Send in batches of 50 (Brevo supports multiple recipients per call)
    const BATCH_SIZE = 50;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipientList.length; i += BATCH_SIZE) {
      const batch = recipientList.slice(i, i + BATCH_SIZE);

      // Use Brevo's batch sending (BCC approach for privacy)
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: batch.map(email => ({ email })),
          subject,
          htmlContent,
        }),
      });

      if (res.ok) {
        totalSent += batch.length;
        console.log(`[send-newsletter] Batch ${Math.floor(i / BATCH_SIZE) + 1} envoyé (${batch.length} emails)`);
      } else {
        const errData = await res.text();
        totalFailed += batch.length;
        console.error(`[send-newsletter] Batch failed:`, errData);
      }

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < recipientList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Log the campaign send
    await supabase.from("email_audit_log").insert({
      recipient: `newsletter_campaign_${recipientList.length}_recipients`,
      type: "newsletter",
      subject,
      status: totalFailed === 0 ? "sent" : "sent",
      error_message: totalFailed > 0 ? `${totalFailed} emails échoués sur ${recipientList.length}` : null,
    });

    console.log(`[send-newsletter] Terminé: ${totalSent} envoyés, ${totalFailed} échoués`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed, total: recipientList.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[send-newsletter] Erreur:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
