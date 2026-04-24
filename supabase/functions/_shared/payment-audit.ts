// Shared helper to log every payment link attempt to payment_link_audit table
// This creates an immutable audit trail to diagnose duplicates and incidents.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PaymentAuditEntry {
  performed_by?: string | null;
  performed_by_email?: string | null;
  quote_id?: string | null;
  invoice_id?: string | null;
  client_email?: string | null;
  client_name?: string | null;
  payment_option: "full" | "deposit" | "installments" | "manual";
  installment_number?: number | null;
  total_installments?: number | null;
  requested_amount?: number | null;
  expected_amount?: number | null;
  action:
    | "link_created"
    | "link_resent"
    | "blocked_duplicate"
    | "blocked_already_paid"
    | "blocked_amount_mismatch"
    | "blocked_wrong_option"
    | "blocked_overflow"
    | "failed";
  status: "success" | "blocked" | "error";
  error_message?: string | null;
  payment_link_url?: string | null;
  stripe_session_id?: string | null;
  source?: "admin_ui" | "webhook" | "automation";
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logPaymentAudit(
  supabase: SupabaseClient,
  entry: PaymentAuditEntry,
): Promise<void> {
  try {
    const amount_match =
      entry.requested_amount != null && entry.expected_amount != null
        ? Math.abs(Number(entry.requested_amount) - Number(entry.expected_amount)) < 0.01
        : null;

    const { error } = await supabase.from("payment_link_audit").insert({
      ...entry,
      amount_match,
      source: entry.source || "admin_ui",
      metadata: entry.metadata || {},
    });

    if (error) {
      console.error("[payment-audit] Failed to log audit entry:", error.message);
    }
  } catch (err) {
    // Audit logging must never break the main flow
    console.error("[payment-audit] Exception while logging:", err);
  }
}

export function extractRequestContext(req: Request): { ip_address: string | null; user_agent: string | null } {
  return {
    ip_address:
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null,
    user_agent: req.headers.get("user-agent") || null,
  };
}
