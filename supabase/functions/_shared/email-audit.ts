import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type EmailType = "alert" | "report" | "reminder" | "quote" | "invoice" | "newsletter" | "notification";
export type EmailStatus = "sent" | "failed" | "pending";

interface EmailAuditEntry {
  user_id?: string;
  recipient: string;
  type: EmailType;
  subject?: string;
  reference_id?: string;
  status: EmailStatus;
  error_message?: string;
}

/**
 * Enregistre un envoi d'email dans le log d'audit
 * @param supabase Client Supabase avec service role
 * @param entry Détails de l'email envoyé
 */
export async function logEmailAudit(
  supabase: SupabaseClient,
  entry: EmailAuditEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from("email_audit_log")
      .insert({
        user_id: entry.user_id || null,
        recipient: entry.recipient,
        type: entry.type,
        subject: entry.subject || null,
        reference_id: entry.reference_id || null,
        status: entry.status,
        error_message: entry.error_message || null,
        sent_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to log email audit:", error);
    }
  } catch (err) {
    console.error("Error logging email audit:", err);
  }
}

/**
 * Envoie un email via Resend et l'enregistre
 * @param params Paramètres de l'email
 * @returns Résultat de l'envoi
 */
export async function sendEmailWithAudit(params: {
  supabase: SupabaseClient;
  to: string;
  from: string;
  subject: string;
  html: string;
  type: EmailType;
  userId?: string;
  referenceId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    await logEmailAudit(params.supabase, {
      recipient: params.to,
      type: params.type,
      subject: params.subject,
      user_id: params.userId,
      reference_id: params.referenceId,
      status: "failed",
      error_message: "Missing RESEND_API_KEY",
    });
    return { success: false, error: "Configuration email manquante" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();

      // Logs détaillés pour debug (timeouts, auth, domaine non vérifié, etc.)
      console.error("[email] Resend API error", {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        body: errorText?.slice?.(0, 2000) ?? errorText,
      });

      await logEmailAudit(params.supabase, {
        recipient: params.to,
        type: params.type,
        subject: params.subject,
        user_id: params.userId,
        reference_id: params.referenceId,
        status: "failed",
        error_message: `Resend API error (${emailResponse.status}): ${errorText}`,
      });
      return { success: false, error: errorText };
    }

    // Succès
    await logEmailAudit(params.supabase, {
      recipient: params.to,
      type: params.type,
      subject: params.subject,
      user_id: params.userId,
      reference_id: params.referenceId,
      status: "sent",
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    console.error("[email] Error sending email:", errorMessage);

    await logEmailAudit(params.supabase, {
      recipient: params.to,
      type: params.type,
      subject: params.subject,
      user_id: params.userId,
      reference_id: params.referenceId,
      status: "failed",
      error_message: errorMessage,
    });
    return { success: false, error: errorMessage };
  } finally {
    clearTimeout(timeoutId);
  }
}
