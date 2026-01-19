import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

interface NewsletterRequest {
  subject: string;
  html_content: string;
  test_mode?: boolean;
  test_email?: string;
}

const BATCH_SIZE = 50;

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Authentification et vérification du rôle admin
    const auth = await authenticateRequest(req);
    if (!auth) {
      console.error("[send-newsletter] Authentication failed");
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) {
      console.error("[send-newsletter] User is not admin:", auth.user.id);
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    console.log(`[send-newsletter] Authenticated admin: ${auth.user.id}`);

    const { subject, html_content, test_mode, test_email }: NewsletterRequest = await req.json();

    if (!subject || !html_content) {
      return new Response(
        JSON.stringify({ error: "subject and html_content are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Créer un client service pour les opérations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const newsletterSenderEmail = Deno.env.get("NEWSLETTER_SENDER_EMAIL") || "Newsletter An Arwen <onboarding@resend.dev>";

    // Mode test : envoyer uniquement à l'email de test
    if (test_mode && test_email) {
      console.log("[send-newsletter] Test mode - sending to:", test_email);
      
      const result = await sendEmailWithAudit({
        supabase,
        to: test_email,
        from: newsletterSenderEmail,
        subject: `[TEST] ${subject}`,
        html: html_content,
        type: "newsletter",
        userId: auth.user.id,
      });

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          test_mode: true,
          sent_to: test_email,
          error: result.error
        }),
        { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mode production : récupérer tous les abonnés actifs
    const { data: subscribers, error: subscribersError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);

    if (subscribersError) {
      console.error("[send-newsletter] Error fetching subscribers:", subscribersError);
      throw new Error("Failed to fetch subscribers");
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active subscribers", sent_count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-newsletter] Sending to ${subscribers.length} subscribers`);

    // Envoyer par batches de 50
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (subscriber) => {
        const result = await sendEmailWithAudit({
          supabase,
          to: subscriber.email,
          from: newsletterSenderEmail,
          subject: subject,
          html: html_content,
          type: "newsletter",
          userId: auth.user.id,
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(`[send-newsletter] Failed to send to ${subscriber.email}:`, result.error);
        }
      });

      await Promise.all(batchPromises);
      
      // Petite pause entre les batches pour éviter le rate limiting
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[send-newsletter] Completed: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: successCount,
        failed_count: failureCount,
        total_subscribers: subscribers.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-newsletter] Error:", errorMessage);
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
