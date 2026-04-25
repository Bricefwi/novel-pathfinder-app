import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  FileText,
  Receipt,
  CalendarCheck,
  CreditCard,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type DrawerSource = "invoices" | "payments" | "quotes" | "bookings" | "schedules";

interface DrawerRecord {
  id: string;
  source: DrawerSource;
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string | null;
  date?: string | null;
  fields: Array<{ label: string; value: string }>;
  flag?: string;
}

interface ConsistencyCheckProps {
  /** KPI values computed locally from the invoices cache. */
  kpis: {
    totalInvoiced: number;
    totalPaid: number;
    totalCollected: number;
    invoiceCount: number;
  };
}

interface RawTotals {
  invoicesTotal: number;
  invoicesPaid: number;
  invoicesCollected: number;
  invoicesCount: number;
  paymentsSucceeded: number;
  quotesAccepted: number;
  bookingsConfirmed: number;
  schedulesPaid: number;
}

const TOLERANCE = 0.01; // 1 cent
const formatEur = (v: number) => `${v.toFixed(2)} €`;

export function ConsistencyCheck({ kpis }: ConsistencyCheckProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const { data: raw, isLoading, refetch } = useQuery({
    queryKey: ["accounting-consistency-raw"],
    queryFn: async (): Promise<RawTotals> => {
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
      return {
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
    },
  });

  const checks = useMemo(() => {
    if (!raw) return [];
    return [
      {
        id: "invoiced",
        label: "Total facturé (KPI vs invoices)",
        kpi: kpis.totalInvoiced,
        raw: raw.invoicesTotal,
        hint: "Le KPI peut être inférieur si une période est filtrée.",
      },
      {
        id: "paid",
        label: "Total payé (KPI vs invoices)",
        kpi: kpis.totalPaid,
        raw: raw.invoicesPaid,
        hint: "Somme des factures avec payment_status = 'paid'.",
      },
      {
        id: "collected",
        label: "Encaissé (KPI vs amount_paid)",
        kpi: kpis.totalCollected,
        raw: raw.invoicesCollected,
        hint: "Somme du champ amount_paid sur toutes les factures.",
      },
      {
        id: "count",
        label: "Nombre de factures (KPI vs total)",
        kpi: kpis.invoiceCount,
        raw: raw.invoicesCount,
        hint: "Diffère si la période active filtre des factures.",
        isCount: true,
      },
      {
        id: "payments-vs-collected",
        label: "Paiements Stripe vs encaissé factures",
        kpi: raw.invoicesCollected,
        raw: raw.paymentsSucceeded,
        hint: "Les paiements réussis devraient correspondre à amount_paid des factures.",
      },
      {
        id: "schedules-vs-collected",
        label: "Échéances payées vs encaissé",
        kpi: raw.invoicesCollected,
        raw: raw.schedulesPaid,
        hint: "Total des payment_schedules au statut 'paid' ≤ encaissé.",
        compareLte: true,
      },
      {
        id: "quotes-vs-invoiced",
        label: "Devis acceptés vs facturé",
        kpi: raw.invoicesTotal,
        raw: raw.quotesAccepted,
        hint: "Les devis acceptés doivent en principe être facturés.",
        compareLte: true,
      },
      {
        id: "bookings-vs-invoiced",
        label: "Réservations confirmées vs facturé",
        kpi: raw.invoicesTotal,
        raw: raw.bookingsConfirmed,
        hint: "Les bookings confirmés doivent être couverts par une facture.",
        compareLte: true,
      },
    ].map((c) => {
      const diff = c.kpi - c.raw;
      const absDiff = Math.abs(diff);
      let ok: boolean;
      if (c.compareLte) {
        // raw should be <= kpi (with tolerance)
        ok = c.raw <= c.kpi + TOLERANCE;
      } else if (c.isCount) {
        ok = c.kpi === c.raw;
      } else {
        ok = absDiff < TOLERANCE;
      }
      return { ...c, diff, absDiff, ok };
    });
  }, [raw, kpis]);

  const divergences = checks.filter((c) => !c.ok);
  const allOk = divergences.length === 0 && !isLoading;

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounting-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["accounting-payments"] }),
        refetch(),
      ]);
      toast.success("Recalcul effectué", {
        description: "Les KPIs ont été régénérés depuis la base.",
      });
    } catch (e) {
      toast.error("Erreur lors du recalcul");
    } finally {
      setRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Vérification de cohérence en cours…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={allOk ? "border-green-500/40" : "border-amber-500/50 bg-amber-500/5"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {allOk ? (
              <>
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Cohérence vérifiée
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                {divergences.length} divergence{divergences.length > 1 ? "s" : ""} détectée{divergences.length > 1 ? "s" : ""}
              </>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={allOk ? "outline" : "default"}
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${recalculating ? "animate-spin" : ""}`} />
              {recalculating ? "Recalcul…" : "Recalculer"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="ml-1">{expanded ? "Masquer" : "Détails"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      {(expanded || !allOk) && (
        <CardContent className="space-y-2">
          {!allOk && (
            <Alert variant="default" className="border-amber-500/40 bg-amber-500/10">
              <AlertTitle className="text-sm">Divergences détectées</AlertTitle>
              <AlertDescription className="text-xs">
                Les écarts peuvent venir d&apos;un filtre de période actif (normal) ou d&apos;une donnée
                désynchronisée (à corriger). Cliquez sur « Recalculer » pour rafraîchir depuis la base.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            {checks.map((c) => (
              <div
                key={c.id}
                className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                  c.ok ? "border-border bg-muted/20" : "border-amber-500/40 bg-amber-500/5"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.label}</span>
                    {c.ok ? (
                      <Badge variant="outline" className="text-green-700 border-green-500/30 text-[10px]">
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-500/40 text-[10px]">
                        Écart {c.isCount ? Math.abs(c.diff) : formatEur(c.absDiff)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>
                </div>
                <div className="text-right text-xs whitespace-nowrap">
                  <div>
                    <span className="text-muted-foreground">KPI :</span>{" "}
                    <span className="font-mono">{c.isCount ? c.kpi : formatEur(c.kpi)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base :</span>{" "}
                    <span className="font-mono">{c.isCount ? c.raw : formatEur(c.raw)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
