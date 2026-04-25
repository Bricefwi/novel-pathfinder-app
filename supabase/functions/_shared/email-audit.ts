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
 * Envoie un email via Brevo (anciennement Sendinblue) et l'enregistre
 */
export async function sendEmailWithAudit(params: {
  supabase: SupabaseClient;
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  type: EmailType;
  userId?: string;
  referenceId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");

  if (!brevoApiKey) {
    await logEmailAudit(params.supabase, {
      recipient: params.to,
      type: params.type,
      subject: params.subject,
      user_id: params.userId,
      reference_id: params.referenceId,
      status: "failed",
      error_message: "Missing BREVO_API_KEY",
    });
    return { success: false, error: "Configuration email manquante" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: params.fromName || params.from.split("<")[0].trim() || "Ferme Arwen",
          email: params.from.includes("<")
            ? params.from.match(/<(.+)>/)?.[1] || params.from
            : params.from,
        },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        headers: {
          "X-Mailin-Track": "0",
          "X-Mailin-Track-Links": "0",
          "X-Mailin-Track-Opens": "0",
        },
        params: {
          trackClicks: false,
          trackOpens: false,
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();

      console.error("[email] Brevo API error", {
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
        error_message: `Brevo API error (${emailResponse.status}): ${errorText}`,
      });
      return { success: false, error: errorText };
    }

    await emailResponse.text(); // consume body

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
