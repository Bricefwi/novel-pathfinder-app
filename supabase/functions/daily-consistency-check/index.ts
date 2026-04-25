import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOLERANCE = 0.01;

interface CheckResult {
  id: string;
  label: string;
  kpi: number;
  raw: number;
  diff: number;
  ok: boolean;
  isCount?: boolean;
  compareLte?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine triggered_by
    let triggeredBy = "cron";
    try {
      const body = await req.json();
      if (body?.triggered_by === "manual") triggeredBy = "manual";
    } catch {
      // No body, default to cron
    }

    console.log(`[daily-consistency-check] Running (triggered_by=${triggeredBy})`);

    // Fetch all source data
    const [invRes, payRes, quoteRes, bookRes, schedRes] = await Promise.all([
      supabase.from("invoices").select("total_amount, amount_paid, payment_status"),
      supabase.from("payments").select("amount, status"),
      supabase.from("quotes").select("total_price, status"),
      supabase.from("bookings").select("total_price, status"),
      supabase.from("payment_schedules").select("expected_amount, status"),
    ]);

    if (invRes.error) throw invRes.error;
    if (payRes.error) throw payRes.error;
    if (quoteRes.error) throw quoteRes.error;
    if (bookRes.error) throw bookRes.error;
    if (schedRes.error) throw schedRes.error;

    const invoices = invRes.data ?? [];
    const totals = {
      invoicesTotal: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
      invoicesPaid: invoices
        .filter((i) => i.payment_status === "paid")
        .reduce((s, i) => s + Number(i.total_amount || 0), 0),
      invoicesCollected: invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0),
      invoicesCount: invoices.length,
      paymentsSucceeded: (payRes.data ?? [])
        .filter((p) => p.status === "succeeded" || p.status === "paid")
        .reduce((s, p) => s + Number(p.amount || 0), 0),
      quotesAccepted: (quoteRes.data ?? [])
        .filter((q) => q.status === "accepted")
        .reduce((s, q) => s + Number(q.total_price || 0), 0),
      bookingsConfirmed: (bookRes.data ?? [])
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + Number(b.total_price || 0), 0),
      schedulesPaid: (schedRes.data ?? [])
        .filter((s) => s.status === "paid")
        .reduce((sum, s) => sum + Number(s.expected_amount || 0), 0),
    };

    // For automated runs, KPIs are computed against ALL invoices (no date filter)
    // This avoids false positives from period-filtered KPIs
    const checks: CheckResult[] = [
      {
        id: "payments-vs-collected",
        label: "Paiements Stripe vs encaissé factures",
        kpi: totals.invoicesCollected,
        raw: totals.paymentsSucceeded,
        diff: 0,
        ok: false,
      },
      {
        id: "schedules-vs-collected",
        label: "Échéances payées vs encaissé",
        kpi: totals.invoicesCollected,
        raw: totals.schedulesPaid,
        diff: 0,
        ok: false,
        compareLte: true,
      },
      {
        id: "quotes-vs-invoiced",
        label: "Devis acceptés vs facturé",
        kpi: totals.invoicesTotal,
        raw: totals.quotesAccepted,
        diff: 0,
        ok: false,
        compareLte: true,
      },
      {
        id: "bookings-vs-invoiced",
        label: "Réservations confirmées vs facturé",
        kpi: totals.invoicesTotal,
        raw: totals.bookingsConfirmed,
        diff: 0,
        ok: false,
        compareLte: true,
      },
    ].map((c) => {
      const diff = c.kpi - c.raw;
      const absDiff = Math.abs(diff);
      let ok: boolean;
      if (c.compareLte) {
        ok = c.raw <= c.kpi + TOLERANCE;
      } else {
        ok = absDiff < TOLERANCE;
      }
      return { ...c, diff, ok };
    });

    const divergences = checks.filter((c) => !c.ok);

    const { data: inserted, error: insertError } = await supabase
      .from("consistency_check_runs")
      .insert({
        triggered_by: triggeredBy,
        total_checks: checks.length,
        divergences_count: divergences.length,
        divergences: divergences,
        totals: totals,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(
      `[daily-consistency-check] Completed: ${divergences.length}/${checks.length} divergences detected`
    );

    return new Response(
      JSON.stringify({
        success: true,
        run_id: inserted.id,
        total_checks: checks.length,
        divergences_count: divergences.length,
        divergences: divergences.map((d) => ({
          id: d.id,
          label: d.label,
          diff: d.diff,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[daily-consistency-check] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
