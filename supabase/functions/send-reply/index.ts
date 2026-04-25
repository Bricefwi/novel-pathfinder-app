import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  greeting, paragraph, separator,
} from "../_shared/email-templates.ts";

interface SendReplyRequest {
  to: string;
  subject: string;
  message: string;
  originalMessage?: string;
  senderName?: string;
}

// Simple idempotency: track recent request hashes to prevent duplicates
const recentRequests = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000; // 10 seconds

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Clean old entries
  for (const [k, ts] of recentRequests) {
    if (now - ts > DEDUP_WINDOW_MS) recentRequests.delete(k);
  }
  if (recentRequests.has(key)) return true;
  recentRequests.set(key, now);
  return false;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Admin-only: authenticate and verify role
    const auth = await authenticateRequest(req);
    if (!auth) return createAuthErrorResponse("Authentication required", 401, corsHeaders);

    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin) return createAuthErrorResponse("Admin access required", 403, corsHeaders);

    const body: SendReplyRequest = await req.json();
    const { to, subject, message, originalMessage, senderName } = body;

    if (!to || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Le destinataire et le message sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Idempotency check
    const dedupKey = `${to}:${subject}:${message.slice(0, 50)}`;
    if (isDuplicate(dedupKey)) {
      console.warn("[send-reply] Duplicate request blocked:", dedupKey);
      return new Response(
        JSON.stringify({ success: true, deduplicated: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const appUrl = getAppUrl();
    const firstName = senderName?.split(" ")[0] || "Client";

    // Build the reply email content
    const bodyContent = [
      greeting(firstName),
      paragraph(message.replace(/\n/g, "<br/>")),
      originalMessage ? [
        separator(),
        `<div style="background:#F5F3F0;padding:15px 20px;border-radius:8px;border-left:3px solid #C9B896;margin:15px 0;">
          <p style="margin:0 0 8px 0;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;">Votre message original</p>
          <p style="margin:0;color:#666;font-size:14px;line-height:1.6;white-space:pre-wrap;">${originalMessage}</p>
        </div>`,
      ].join("") : "",
      separator(),
      paragraph(
        `Pour toute question complémentaire, vous pouvez répondre directement à cet email ou nous appeler au <strong>06 59 22 62 70</strong>.`
      ),
      `<p style="margin:20px 0 0 0;color:#333;font-size:15px;line-height:1.6;">
        À très bientôt ! 🌿<br/>
        <strong>L'équipe An Arwen</strong>
      </p>`,
    ].join("");

    const htmlContent = wrapInBrandedLayout("Réponse à votre message", bodyContent, {
      preheader: subject,
      ctaUrl: `${appUrl}/contact`,
      ctaLabel: "Nous contacter",
    });

    const sender = EMAIL_SENDERS.contact;

    const result = await sendEmailWithAudit({
      supabase: supabaseService,
      to,
      from: `${sender.name} <${sender.email}>`,
      subject,
      html: htmlContent,
      type: "notification",
      userId: auth.user.id,
    });

    if (!result.success) {
      console.error("[send-reply] Email send failed:", result.error);
      return new Response(
        JSON.stringify({ error: `Erreur Brevo: ${result.error}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-reply] Reply sent to ${to}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-reply] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
