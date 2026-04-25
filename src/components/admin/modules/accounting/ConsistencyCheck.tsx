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
  History,
  PlayCircle,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useConsistencyRuns, acknowledgeConsistencyRun } from "@/hooks/use-consistency-runs";

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
  const [drawerCheckId, setDrawerCheckId] = useState<string | null>(null);
  const [drawerRecords, setDrawerRecords] = useState<DrawerRecord[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerDescription, setDrawerDescription] = useState("");

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

  const fmtDate = (d?: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—";

  const openDrawer = async (checkId: string, label: string, hint: string) => {
    setDrawerCheckId(checkId);
    setDrawerTitle(label);
    setDrawerDescription(hint);
    setDrawerLoading(true);
    setDrawerRecords([]);

    try {
      const records: DrawerRecord[] = [];

      switch (checkId) {
        case "invoiced":
        case "count": {
          const { data, error } = await supabase
            .from("invoices")
            .select("id, invoice_number, client_name, client_email, total_amount, amount_paid, payment_status, status, created_at, start_date")
            .order("created_at", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((i) => {
            records.push({
              id: i.id,
              source: "invoices",
              title: i.invoice_number ?? "Facture",
              subtitle: `${i.client_name ?? "—"} · ${i.client_email ?? ""}`,
              amount: Number(i.total_amount || 0),
              status: i.payment_status,
              date: i.created_at,
              fields: [
                { label: "N°", value: i.invoice_number ?? "—" },
                { label: "Client", value: i.client_name ?? "—" },
                { label: "Email", value: i.client_email ?? "—" },
                { label: "Montant TTC", value: formatEur(Number(i.total_amount || 0)) },
                { label: "Encaissé", value: formatEur(Number(i.amount_paid || 0)) },
                { label: "Statut paiement", value: i.payment_status ?? "—" },
                { label: "Statut facture", value: i.status ?? "—" },
                { label: "Créée le", value: fmtDate(i.created_at) },
                { label: "Début séjour", value: fmtDate(i.start_date) },
              ],
            });
          });
          break;
        }
        case "paid": {
          const { data, error } = await supabase
            .from("invoices")
            .select("id, invoice_number, client_name, client_email, total_amount, amount_paid, payment_status, payment_date, payment_method")
            .eq("payment_status", "paid")
            .order("payment_date", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((i) => {
            records.push({
              id: i.id,
              source: "invoices",
              title: i.invoice_number ?? "Facture payée",
              subtitle: `${i.client_name ?? "—"}`,
              amount: Number(i.total_amount || 0),
              status: "paid",
              date: i.payment_date,
              fields: [
                { label: "N°", value: i.invoice_number ?? "—" },
                { label: "Client", value: i.client_name ?? "—" },
                { label: "Email", value: i.client_email ?? "—" },
                { label: "Montant TTC", value: formatEur(Number(i.total_amount || 0)) },
                { label: "Encaissé", value: formatEur(Number(i.amount_paid || 0)) },
                { label: "Méthode", value: i.payment_method ?? "—" },
                { label: "Date paiement", value: fmtDate(i.payment_date) },
              ],
              flag:
                Number(i.amount_paid || 0) < Number(i.total_amount || 0)
                  ? "Encaissé < TTC"
                  : undefined,
            });
          });
          break;
        }
        case "collected": {
          const { data, error } = await supabase
            .from("invoices")
            .select("id, invoice_number, client_name, total_amount, amount_paid, payment_status, payment_date")
            .gt("amount_paid", 0)
            .order("payment_date", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((i) => {
            const ttc = Number(i.total_amount || 0);
            const paid = Number(i.amount_paid || 0);
            records.push({
              id: i.id,
              source: "invoices",
              title: i.invoice_number ?? "Facture",
              subtitle: i.client_name ?? "—",
              amount: paid,
              status: i.payment_status,
              date: i.payment_date,
              fields: [
                { label: "N°", value: i.invoice_number ?? "—" },
                { label: "Client", value: i.client_name ?? "—" },
                { label: "TTC", value: formatEur(ttc) },
                { label: "Encaissé", value: formatEur(paid) },
                { label: "Reste dû", value: formatEur(Math.max(0, ttc - paid)) },
                { label: "Date paiement", value: fmtDate(i.payment_date) },
              ],
              flag: paid > ttc + TOLERANCE ? "Surpaiement" : undefined,
            });
          });
          break;
        }
        case "payments-vs-collected": {
          const { data, error } = await supabase
            .from("payments")
            .select("id, amount, status, currency, payment_type, client_name, client_email, invoice_id, quote_id, created_at")
            .order("created_at", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((p) => {
            records.push({
              id: p.id,
              source: "payments",
              title: `Paiement ${formatEur(Number(p.amount || 0))}`,
              subtitle: `${p.client_name ?? "—"} · ${p.payment_type ?? "—"}`,
              amount: Number(p.amount || 0),
              status: p.status,
              date: p.created_at,
              fields: [
                { label: "Montant", value: formatEur(Number(p.amount || 0)) },
                { label: "Devise", value: (p.currency ?? "eur").toUpperCase() },
                { label: "Type", value: p.payment_type ?? "—" },
                { label: "Statut", value: p.status ?? "—" },
                { label: "Client", value: p.client_name ?? "—" },
                { label: "Email", value: p.client_email ?? "—" },
                { label: "Facture liée", value: p.invoice_id ?? "—" },
                { label: "Devis lié", value: p.quote_id ?? "—" },
                { label: "Créé le", value: fmtDate(p.created_at) },
              ],
              flag:
                p.status !== "succeeded" && p.status !== "paid"
                  ? `Non encaissé (${p.status})`
                  : undefined,
            });
          });
          break;
        }
        case "schedules-vs-collected": {
          const { data, error } = await supabase
            .from("payment_schedules")
            .select("id, installment_number, total_installments, expected_amount, status, due_date, paid_at, invoice_id, quote_id, percentage")
            .order("due_date", { ascending: true });
          if (error) throw error;
          (data ?? []).forEach((s) => {
            records.push({
              id: s.id,
              source: "schedules",
              title: `Échéance ${s.installment_number}/${s.total_installments}`,
              subtitle: `${formatEur(Number(s.expected_amount || 0))} · ${s.status}`,
              amount: Number(s.expected_amount || 0),
              status: s.status,
              date: s.due_date,
              fields: [
                { label: "Échéance", value: `${s.installment_number}/${s.total_installments}` },
                { label: "Montant attendu", value: formatEur(Number(s.expected_amount || 0)) },
                { label: "Pourcentage", value: s.percentage ? `${s.percentage}%` : "—" },
                { label: "Statut", value: s.status ?? "—" },
                { label: "Échéance le", value: fmtDate(s.due_date) },
                { label: "Payée le", value: fmtDate(s.paid_at) },
                { label: "Facture liée", value: s.invoice_id ?? "—" },
                { label: "Devis lié", value: s.quote_id ?? "—" },
              ],
            });
          });
          break;
        }
        case "quotes-vs-invoiced": {
          const { data, error } = await supabase
            .from("quotes")
            .select("id, quote_number, client_name, client_email, total_price, status, valid_until, start_date, created_at")
            .eq("status", "accepted")
            .order("created_at", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((q) => {
            records.push({
              id: q.id,
              source: "quotes",
              title: q.quote_number ?? "Devis",
              subtitle: q.client_name ?? "—",
              amount: Number(q.total_price || 0),
              status: q.status,
              date: q.created_at,
              fields: [
                { label: "N°", value: q.quote_number ?? "—" },
                { label: "Client", value: q.client_name ?? "—" },
                { label: "Email", value: q.client_email ?? "—" },
                { label: "Montant", value: formatEur(Number(q.total_price || 0)) },
                { label: "Statut", value: q.status ?? "—" },
                { label: "Valide jusqu'au", value: fmtDate(q.valid_until) },
                { label: "Début séjour", value: fmtDate(q.start_date) },
                { label: "Créé le", value: fmtDate(q.created_at) },
              ],
            });
          });
          break;
        }
        case "bookings-vs-invoiced": {
          const { data, error } = await supabase
            .from("bookings")
            .select("id, contact_name, contact_email, contact_phone, total_price, status, participants, start_date, end_date, created_at")
            .in("status", ["confirmed", "completed"])
            .order("start_date", { ascending: false });
          if (error) throw error;
          (data ?? []).forEach((b) => {
            records.push({
              id: b.id,
              source: "bookings",
              title: `Réservation ${b.contact_name ?? ""}`.trim(),
              subtitle: b.contact_email ?? "—",
              amount: Number(b.total_price || 0),
              status: b.status,
              date: b.start_date,
              fields: [
                { label: "Client", value: b.contact_name ?? "—" },
                { label: "Email", value: b.contact_email ?? "—" },
                { label: "Téléphone", value: b.contact_phone ?? "—" },
                { label: "Participants", value: String(b.participants ?? "—") },
                { label: "Montant", value: formatEur(Number(b.total_price || 0)) },
                { label: "Statut", value: b.status ?? "—" },
                { label: "Début", value: fmtDate(b.start_date) },
                { label: "Fin", value: fmtDate(b.end_date) },
                { label: "Créée le", value: fmtDate(b.created_at) },
              ],
            });
          });
          break;
        }
      }

      setDrawerRecords(records);
    } catch (e) {
      console.error("[ConsistencyCheck] openDrawer error:", e);
      toast.error("Impossible de charger les enregistrements");
    } finally {
      setDrawerLoading(false);
    }
  };

  const sourceMeta: Record<DrawerSource, { label: string; icon: typeof FileText; color: string }> = {
    invoices: { label: "Facture", icon: Receipt, color: "text-secondary-foreground" },
    payments: { label: "Paiement", icon: CreditCard, color: "text-primary" },
    quotes: { label: "Devis", icon: FileText, color: "text-primary" },
    bookings: { label: "Réservation", icon: CalendarCheck, color: "text-accent-foreground" },
    schedules: { label: "Échéance", icon: ListChecks, color: "text-secondary-foreground" },
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
                <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                  <div className="text-right text-xs">
                    <div>
                      <span className="text-muted-foreground">KPI :</span>{" "}
                      <span className="font-mono">{c.isCount ? c.kpi : formatEur(c.kpi)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Base :</span>{" "}
                      <span className="font-mono">{c.isCount ? c.raw : formatEur(c.raw)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => openDrawer(c.id, c.label, c.hint)}
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Inspecter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      <Sheet
        open={drawerCheckId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerCheckId(null);
            setDrawerRecords([]);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              {drawerTitle}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {drawerDescription}
              <br />
              <span className="text-muted-foreground">
                {drawerLoading ? "Chargement…" : `${drawerRecords.length} enregistrement(s) trouvé(s).`}
              </span>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
            {drawerLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Chargement des enregistrements…
              </div>
            ) : drawerRecords.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Aucun enregistrement à afficher.
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {drawerRecords.map((rec) => {
                  const meta = sourceMeta[rec.source];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={`${rec.source}-${rec.id}`}
                      className="rounded-md border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{rec.title}</p>
                            {rec.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{rec.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {meta.label}
                          </Badge>
                          {rec.status && (
                            <Badge variant="secondary" className="text-[10px]">
                              {rec.status}
                            </Badge>
                          )}
                          {rec.flag && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/40 text-amber-700 bg-amber-500/10"
                            >
                              ⚠ {rec.flag}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {rec.fields.map((f, idx) => (
                          <div key={idx} className="flex flex-col min-w-0">
                            <dt className="text-muted-foreground text-[10px] uppercase tracking-wide">
                              {f.label}
                            </dt>
                            <dd className="font-mono truncate" title={f.value}>
                              {f.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
