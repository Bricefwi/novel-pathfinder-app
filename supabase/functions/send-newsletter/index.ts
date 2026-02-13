import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authenticateRequest, verifyAdminRole, createAuthErrorResponse,
} from "../_shared/rbac.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface SegmentFilters {
  ridingLevels?: string[];
  tripTypes?: string[];
  dreamDestinations?: string[];
  specificEmails?: string[];
}

interface NewsletterRequest {
  subject: string;
  content: string;
  testEmail?: string;
  filters?: SegmentFilters;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // ── AUTH: Vérifier que l'appelant est un admin authentifié ──
    const auth = await authenticateRequest(req);
    if (!auth) {
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) {
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    const { subject, content, testEmail, filters }: NewsletterRequest = await req.json();

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

    const htmlContent = wrapInBrandedLayout("Newsletter", content, {
      preheader: subject,
      unsubscribeUrl: `${appUrl}/mon-espace`,
    });

    const sender = EMAIL_SENDERS.newsletter;

    // ── TEST MODE ──
    if (testEmail) {
      console.log(`[send-newsletter] Mode test → envoi à : ${testEmail}`);
      const result = await sendEmailWithAudit({
        supabase, to: testEmail,
        from: `${sender.name} <${sender.email}>`,
        subject: `[TEST] ${subject}`, html: htmlContent, type: "newsletter",
      });
      if (!result.success) throw new Error(result.error);
      return new Response(JSON.stringify({ success: true, sent: 1, mode: "test" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // ── SPECIFIC EMAILS (from CRM selection) ──
    if (filters?.specificEmails && filters.specificEmails.length > 0) {
      console.log(`[send-newsletter] Mode sélection CRM → ${filters.specificEmails.length} destinataires`);
      const recipientList = filters.specificEmails.map(e => e.toLowerCase());
      const result = await sendBatches(recipientList, sender, subject, htmlContent, supabase, filters);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // ── SEGMENTED / ALL MODE ──
    const hasFilters = filters && (
      (filters.ridingLevels && filters.ridingLevels.length > 0) ||
      (filters.tripTypes && filters.tripTypes.length > 0) ||
      (filters.dreamDestinations && filters.dreamDestinations.length > 0)
    );

    // Get all user emails
    const { data: userEmails } = await supabase.rpc("get_user_emails_for_profiles");
    const emailMap = new Map<string, string>();
    (userEmails || []).forEach((u: { user_id: string; email: string }) => {
      emailMap.set(u.user_id, u.email.toLowerCase());
    });

    let profileEmails: string[] = [];

    if (hasFilters) {
      // Build segmented query
      let query = supabase.from("profiles").select("user_id, riding_level, preferred_trip_types, dream_destinations")
        .eq("newsletter_subscribed", true);

      const { data: filteredProfiles } = await query;
      
      if (filteredProfiles) {
        profileEmails = filteredProfiles
          .filter(p => {
            // Riding level filter
            if (filters!.ridingLevels && filters!.ridingLevels.length > 0) {
              if (!p.riding_level || !filters!.ridingLevels.includes(p.riding_level)) return false;
            }
            // Trip types filter
            if (filters!.tripTypes && filters!.tripTypes.length > 0) {
              const userTypes = p.preferred_trip_types || [];
              if (!filters!.tripTypes.some(t => userTypes.includes(t))) return false;
            }
            // Dream destinations filter
            if (filters!.dreamDestinations && filters!.dreamDestinations.length > 0) {
              const userDests = (p.dream_destinations || []).map((d: string) => d.toLowerCase());
              if (!filters!.dreamDestinations.some(d => userDests.some((ud: string) => ud.includes(d.toLowerCase())))) return false;
            }
            return true;
          })
          .map(p => emailMap.get(p.user_id))
          .filter((e): e is string => !!e);
      }
    } else {
      // No filters: all newsletter subscribers
      const { data: profileSubscribers } = await supabase
        .from("profiles").select("user_id").eq("newsletter_subscribed", true);
      
      if (profileSubscribers) {
        const subscribedUserIds = new Set(profileSubscribers.map(p => p.user_id));
        profileEmails = Array.from(subscribedUserIds)
          .map(uid => emailMap.get(uid))
          .filter((e): e is string => !!e);
      }
    }

    // Also include newsletter_subscribers table
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers").select("email").eq("is_active", true);

    // Merge and deduplicate
    const allEmails = new Set<string>();
    subscribers?.forEach(s => allEmails.add(s.email.toLowerCase()));
    profileEmails.forEach(e => allEmails.add(e));

    const recipientList = Array.from(allEmails);

    if (recipientList.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Aucun abonné correspondant aux critères." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[send-newsletter] Envoi à ${recipientList.length} abonnés (filtres: ${hasFilters ? "oui" : "non"})`);
    const result = await sendBatches(recipientList, sender, subject, htmlContent, supabase, filters);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[send-newsletter] Erreur:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

async function sendBatches(
  recipientList: string[],
  sender: { name: string; email: string },
  subject: string,
  htmlContent: string,
  supabase: any,
  filters?: SegmentFilters
) {
  const BATCH_SIZE = 50;
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < recipientList.length; i += BATCH_SIZE) {
    const batch = recipientList.slice(i, i + BATCH_SIZE);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY! },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to: batch.map(email => ({ email })),
        subject, htmlContent,
      }),
    });

    if (res.ok) {
      totalSent += batch.length;
    } else {
      totalFailed += batch.length;
      console.error(`[send-newsletter] Batch failed:`, await res.text());
    }

    if (i + BATCH_SIZE < recipientList.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Audit log
  const filterDesc = filters ? JSON.stringify(filters) : "tous";
  await supabase.from("email_audit_log").insert({
    recipient: `newsletter_campaign_${recipientList.length}_recipients`,
    type: "newsletter",
    subject,
    status: "sent",
    error_message: totalFailed > 0 ? `${totalFailed} échoués sur ${recipientList.length} | Filtres: ${filterDesc}` : null,
  });

  return { success: true, sent: totalSent, failed: totalFailed, total: recipientList.length };
}
