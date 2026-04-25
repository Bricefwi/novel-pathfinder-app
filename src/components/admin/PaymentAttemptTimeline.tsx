import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Ban,
  Clock,
  ExternalLink,
  Activity,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ArrowRight,
  GitCompare,
  Receipt,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AuditEntry {
  id: string;
  created_at: string;
  performed_by_email: string | null;
  payment_option: string;
  installment_number: number | null;
  total_installments: number | null;
  requested_amount: number | null;
  expected_amount: number | null;
  amount_match: boolean | null;
  action: string;
  status: "success" | "blocked" | "error";
  error_message: string | null;
  payment_link_url: string | null;
  stripe_session_id: string | null;
  source: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
}

interface PaymentAttemptTimelineProps {
  quoteId: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; ringColor: string; icon: React.ReactNode; label: string }
> = {
  success: {
    color: "text-primary",
    bgColor: "bg-primary",
    ringColor: "ring-primary/20",
    icon: <CheckCircle2 className="h-4 w-4 text-primary-foreground" />,
    label: "Succès",
  },
  blocked: {
    color: "text-destructive",
    bgColor: "bg-destructive",
    ringColor: "ring-destructive/20",
    icon: <Ban className="h-4 w-4 text-destructive-foreground" />,
    label: "Bloqué (409)",
  },
  error: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500",
    ringColor: "ring-orange-500/20",
    icon: <XCircle className="h-4 w-4 text-white" />,
    label: "Erreur",
  },
};

const ACTION_LABELS: Record<string, string> = {
  link_created: "Lien créé",
  link_resent: "Lien renvoyé",
  blocked_duplicate: "Doublon refusé",
  blocked_already_paid: "Déjà payé",
  blocked_amount_mismatch: "Montant incohérent",
  blocked_wrong_option: "Mauvaise option",
  blocked_overflow: "Somme dépassée",
  failed: "Échec technique",
};

interface ScheduleRef {
  id: string;
  installment_number: number;
  total_installments: number;
  status: string;
  expected_amount: number;
}

const buildStripeDashboardUrl = (sessionId: string): string => {
  // Detect test vs live based on session id prefix; both use the same dashboard URL pattern
  const base = "https://dashboard.stripe.com";
  if (sessionId.startsWith("cs_test_")) return `${base}/test/payments?query=${sessionId}`;
  return `${base}/payments?query=${sessionId}`;
};

interface DiffItem {
  field: string;
  before: string;
  after: string;
}

const computeDiff = (curr: AuditEntry, prev: AuditEntry): DiffItem[] => {
  const diffs: DiffItem[] = [];
  const fmtAmt = (a: number | null) => (a == null ? "—" : `${Number(a).toFixed(2)}€`);

  if (curr.payment_option !== prev.payment_option) {
    diffs.push({ field: "Option de paiement", before: prev.payment_option, after: curr.payment_option });
  }
  if ((curr.installment_number ?? null) !== (prev.installment_number ?? null)) {
    diffs.push({
      field: "Versement",
      before: prev.installment_number ? `${prev.installment_number}/${prev.total_installments}` : "—",
      after: curr.installment_number ? `${curr.installment_number}/${curr.total_installments}` : "—",
    });
  }
  if ((curr.requested_amount ?? null) !== (prev.requested_amount ?? null)) {
    diffs.push({
      field: "Montant demandé",
      before: fmtAmt(prev.requested_amount),
      after: fmtAmt(curr.requested_amount),
    });
  }
  if ((curr.expected_amount ?? null) !== (prev.expected_amount ?? null)) {
    diffs.push({
      field: "Montant attendu",
      before: fmtAmt(prev.expected_amount),
      after: fmtAmt(curr.expected_amount),
    });
  }
  if (curr.status !== prev.status) {
    diffs.push({ field: "Statut", before: prev.status, after: curr.status });
  }
  if (curr.action !== prev.action) {
    diffs.push({
      field: "Action",
      before: ACTION_LABELS[prev.action] || prev.action,
      after: ACTION_LABELS[curr.action] || curr.action,
    });
  }
  if ((curr.performed_by_email ?? null) !== (prev.performed_by_email ?? null)) {
    diffs.push({
      field: "Auteur",
      before: prev.performed_by_email || "—",
      after: curr.performed_by_email || "—",
    });
  }
  return diffs;
};

const CSV_COLUMNS: { key: keyof AuditEntry | "action_label" | "status_label"; header: string }[] = [
  { key: "created_at", header: "Date" },
  { key: "status", header: "Statut" },
  { key: "status_label", header: "Statut (libellé)" },
  { key: "action", header: "Action" },
  { key: "action_label", header: "Action (libellé)" },
  { key: "payment_option", header: "Option de paiement" },
  { key: "installment_number", header: "N° versement" },
  { key: "total_installments", header: "Total versements" },
  { key: "requested_amount", header: "Montant demandé (€)" },
  { key: "expected_amount", header: "Montant attendu (€)" },
  { key: "amount_match", header: "Montant cohérent" },
  { key: "performed_by_email", header: "Auteur" },
  { key: "source", header: "Source" },
  { key: "ip_address", header: "IP" },
  { key: "stripe_session_id", header: "Stripe session" },
  { key: "payment_link_url", header: "Lien de paiement" },
  { key: "error_message", header: "Message d'erreur" },
  { key: "metadata", header: "Metadata" },
  { key: "id", header: "ID audit" },
];

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const buildCsv = (entries: AuditEntry[]): string => {
  const header = CSV_COLUMNS.map((c) => c.header).join(";");
  const rows = entries.map((e) =>
    CSV_COLUMNS.map((c) => {
      if (c.key === "action_label") return escapeCsvCell(ACTION_LABELS[e.action] || e.action);
      if (c.key === "status_label") return escapeCsvCell(STATUS_CONFIG[e.status]?.label || e.status);
      if (c.key === "created_at")
        return escapeCsvCell(format(new Date(e.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr }));
      return escapeCsvCell((e as unknown as Record<string, unknown>)[c.key as string]);
    }).join(";"),
  );
  return [header, ...rows].join("\n");
};

const downloadFile = (content: string | Blob, filename: string, mime: string) => {
  const blob = content instanceof Blob ? content : new Blob([`\ufeff${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const openPdfPrintWindow = (entries: AuditEntry[], quoteId: string) => {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    toast.error("Impossible d'ouvrir la fenêtre d'impression. Autorisez les pop-ups.");
    return;
  }
  const generated = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const rows = entries
    .map((e) => {
      const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.error;
      const date = format(new Date(e.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr });
      const installment = e.installment_number
        ? `${e.installment_number}/${e.total_installments || "?"}`
        : "—";
      const amounts = `${e.requested_amount != null ? Number(e.requested_amount).toFixed(2) + "€" : "—"} / ${
        e.expected_amount != null ? Number(e.expected_amount).toFixed(2) + "€" : "—"
      }`;
      const meta = e.metadata && Object.keys(e.metadata).length > 0
        ? `<pre>${JSON.stringify(e.metadata, null, 2).replace(/</g, "&lt;")}</pre>`
        : "—";
      return `
        <tr>
          <td>${date}</td>
          <td><span class="badge ${e.status}">${cfg.label}</span><br/><small>${ACTION_LABELS[e.action] || e.action}</small></td>
          <td>${e.payment_option}<br/><small>vers. ${installment}</small></td>
          <td>${amounts}${e.amount_match === false ? '<br/><small class="warn">incohérent</small>' : ""}</td>
          <td><small>${e.performed_by_email || "—"}</small><br/><small>${e.source || ""}</small></td>
          <td><small>${e.ip_address || "—"}</small></td>
          <td><small style="word-break:break-all">${e.stripe_session_id || "—"}</small></td>
          <td><small style="word-break:break-all">${e.payment_link_url || "—"}</small></td>
          <td><small style="color:#b91c1c">${e.error_message || ""}</small>${meta !== "—" ? `<details><summary>Metadata</summary>${meta}</details>` : ""}</td>
        </tr>
      `;
    })
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
    <title>Chronologie paiements - ${quoteId}</title>
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
      h1 { font-family: Georgia, serif; font-size: 20px; margin: 0 0 4px; }
      .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #f9fafb; font-weight: 600; }
      .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 9px; }
      .badge.success { background: #dcfce7; color: #166534; }
      .badge.blocked { background: #fee2e2; color: #991b1b; }
      .badge.error { background: #ffedd5; color: #9a3412; }
      .warn { color: #b91c1c; font-weight: 600; }
      pre { background: #f3f4f6; padding: 4px; font-size: 9px; white-space: pre-wrap; word-break: break-all; max-width: 200px; }
      details { margin-top: 4px; }
      @media print { body { padding: 12px; } }
    </style>
  </head><body>
    <h1>Chronologie des tentatives de paiement</h1>
    <div class="meta">Devis : ${quoteId} • Généré le ${generated} • ${entries.length} événement(s)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Statut / Action</th><th>Option / Versement</th>
          <th>Demandé / Attendu</th><th>Auteur</th><th>IP</th>
          <th>Stripe session</th><th>Lien</th><th>Erreur / Metadata</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center">Aucune tentative</td></tr>'}</tbody>
    </table>
    <script>setTimeout(() => window.print(), 400);</script>
  </body></html>`);
  win.document.close();
};

export const PaymentAttemptTimeline = ({ quoteId }: PaymentAttemptTimelineProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "blocked" | "error">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      const [auditRes, schedulesRes] = await Promise.all([
        supabase
          .from("payment_link_audit")
          .select("*")
          .eq("quote_id", quoteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_schedules")
          .select("id, installment_number, total_installments, status, expected_amount")
          .eq("quote_id", quoteId)
          .order("installment_number", { ascending: true }),
      ]);

      if (!auditRes.error && auditRes.data) setEntries(auditRes.data as AuditEntry[]);
      if (!schedulesRes.error && schedulesRes.data) setSchedules(schedulesRes.data as ScheduleRef[]);
      setLoading(false);
    };

    fetchTimeline();

    // Realtime subscription for new attempts on this quote
    const channel = supabase
      .channel(`payment-audit-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payment_link_audit",
          filter: `quote_id=eq.${quoteId}`,
        },
        (payload) => {
          setEntries((prev) => [payload.new as AuditEntry, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Find related payment schedule for a given audit entry (by installment number)
  const findSchedule = (entry: AuditEntry): ScheduleRef | undefined => {
    if (!entry.installment_number) return undefined;
    return schedules.find((s) => s.installment_number === entry.installment_number);
  };

  // Find the previous attempt (chronologically older) for the SAME installment
  // entries are sorted DESC, so the "previous" attempt is the next index in the array
  const findPreviousAttempt = (entry: AuditEntry, index: number): AuditEntry | undefined => {
    for (let i = index + 1; i < entries.length; i++) {
      const candidate = entries[i];
      // Same scope (same installment OR both targeting the same payment_option without installment)
      if (
        candidate.installment_number === entry.installment_number &&
        candidate.payment_option === entry.payment_option
      ) {
        return candidate;
      }
    }
    return undefined;
  };


  // Group by installment for sub-totals
  const stats = {
    total: entries.length,
    success: entries.filter((e) => e.status === "success").length,
    blocked: entries.filter((e) => e.status === "blocked").length,
    errors: entries.filter((e) => e.status === "error").length,
  };

  // Per-installment counters (for clarity on which versement is most contested)
  const perInstallment = entries.reduce<Record<string, { total: number; blocked: number }>>((acc, e) => {
    const key = e.installment_number
      ? `${e.installment_number}/${e.total_installments || "?"}`
      : e.payment_option;
    if (!acc[key]) acc[key] = { total: 0, blocked: 0 };
    acc[key].total += 1;
    if (e.status === "blocked") acc[key].blocked += 1;
    return acc;
  }, {});

  // Latest event per installment (entries are sorted DESC, so first match wins)
  // Builds an array indexed by installment_number with the most recent attempt per versement
  const latestPerInstallment = (() => {
    const seen = new Map<string, AuditEntry>();
    for (const e of entries) {
      const key = e.installment_number
        ? `inst-${e.installment_number}`
        : `opt-${e.payment_option}`;
      if (!seen.has(key)) seen.set(key, e);
    }
    // Sort by installment number ascending (1, 2, 3) then by option name
    return Array.from(seen.entries()).sort(([a], [b]) => {
      const aIsInst = a.startsWith("inst-");
      const bIsInst = b.startsWith("inst-");
      if (aIsInst && bIsInst) return parseInt(a.slice(5)) - parseInt(b.slice(5));
      if (aIsInst) return -1;
      if (bIsInst) return 1;
      return a.localeCompare(b);
    });
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          Chronologie des tentatives de paiement
          <Badge variant="outline" className="ml-auto text-xs">
            {entries.length} événement{entries.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Toutes les tentatives (succès, refus 409, erreurs) regroupées par ordre antichronologique. Mise à jour en temps réel.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={entries.length === 0}
              onClick={() => {
                const csv = buildCsv(entries);
                const filename = `chronologie-paiements-${quoteId}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
                downloadFile(csv, filename, "text/csv;charset=utf-8");
                toast.success(`Export CSV (${entries.length} ligne${entries.length > 1 ? "s" : ""})`);
              }}
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={entries.length === 0}
              onClick={() => {
                openPdfPrintWindow(entries, quoteId);
                toast.success("Fenêtre d'impression PDF ouverte");
              }}
            >
              <FileText className="h-3 w-3" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats compactes */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-primary/5 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Succès</p>
            <p className="text-lg font-bold text-primary">{stats.success}</p>
          </div>
          <div className="rounded-lg bg-destructive/5 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bloqués</p>
            <p className="text-lg font-bold text-destructive">{stats.blocked}</p>
          </div>
          <div className="rounded-lg bg-orange-500/5 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Erreurs</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.errors}</p>
          </div>
        </div>

        {/* Latest status per installment — quick at-a-glance summary */}
        {latestPerInstallment.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
              Dernier événement par versement
            </p>
            <div className="space-y-1.5">
              {latestPerInstallment.map(([key, latest]) => {
                const cfg = STATUS_CONFIG[latest.status] || STATUS_CONFIG.error;
                const label = key.startsWith("inst-")
                  ? `Versement ${latest.installment_number}/${latest.total_installments || "?"}`
                  : latest.payment_option;
                const date = new Date(latest.created_at);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full ${cfg.bgColor} shrink-0`}>
                        <span className="scale-75">{cfg.icon}</span>
                      </div>
                      <span className="font-medium truncate">{label}</span>
                      <Badge variant="outline" className={`text-[9px] py-0 ${cfg.color} shrink-0`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <span
                      className="text-muted-foreground text-[10px] shrink-0"
                      title={format(date, "PPpp", { locale: fr })}
                    >
                      {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-installment heatmap (nb total/bloqué) */}
        {Object.keys(perInstallment).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(perInstallment).map(([key, v]) => (
              <Badge
                key={key}
                variant={v.blocked > 0 ? "destructive" : "outline"}
                className="text-xs gap-1"
                title={`${v.total} tentative(s), ${v.blocked} bloquée(s)`}
              >
                {key} • {v.total} tent.
                {v.blocked > 0 && <span className="font-bold">({v.blocked} 🚫)</span>}
              </Badge>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aucune tentative de génération de lien pour ce devis.
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-3">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" aria-hidden />

              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.error;
                  const isExpanded = expandedIds.has(entry.id);
                  const actionLabel = ACTION_LABELS[entry.action] || entry.action;
                  const date = new Date(entry.created_at);
                  const relatedSchedule = findSchedule(entry);
                  const previousAttempt = findPreviousAttempt(entry, index);
                  const diffs = previousAttempt ? computeDiff(entry, previousAttempt) : [];

                  return (
                    <div key={entry.id} className="relative pl-10">
                      {/* Dot */}
                      <div
                        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ${cfg.bgColor} ring-4 ${cfg.ringColor}`}
                      >
                        {cfg.icon}
                      </div>

                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(entry.id)}>
                        <div
                          className={`rounded-lg border p-3 ${
                            entry.status === "blocked"
                              ? "border-destructive/30 bg-destructive/5"
                              : entry.status === "error"
                                ? "border-orange-500/30 bg-orange-500/5"
                                : "border-primary/30 bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2 mb-1">
                                <span className={`font-semibold text-sm ${cfg.color}`}>{actionLabel}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {cfg.label}
                                </Badge>
                                {entry.installment_number && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Versement {entry.installment_number}/{entry.total_installments}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  {entry.payment_option}
                                </Badge>
                              </div>

                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span title={format(date, "PPpp", { locale: fr })}>
                                    {format(date, "dd/MM/yyyy à HH:mm:ss", { locale: fr })}
                                    <span className="text-muted-foreground/70 ml-1">
                                      ({formatDistanceToNow(date, { addSuffix: true, locale: fr })})
                                    </span>
                                  </span>
                                </div>
                                {entry.performed_by_email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span>{entry.performed_by_email}</span>
                                    {entry.source && (
                                      <Badge variant="outline" className="text-[9px] py-0">
                                        {entry.source}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {entry.requested_amount != null && (
                                  <div className="flex items-center gap-2">
                                    <span>
                                      💶 {Number(entry.requested_amount).toFixed(2)}€
                                      {entry.amount_match === false && entry.expected_amount != null && (
                                        <span className="text-destructive ml-1">
                                          (attendu : {Number(entry.expected_amount).toFixed(2)}€)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {entry.error_message && (
                                  <div className="flex items-start gap-2 mt-1 text-destructive">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span className="break-words">{entry.error_message}</span>
                                  </div>
                                )}
                              </div>

                              {/* Direct links to related Stripe / payment schedule / quote */}
                              <div className="flex flex-wrap gap-3 mt-2">
                                <a
                                  href={`/admin?section=quotes-invoices&quoteId=${quoteId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                  title="Ouvrir la fiche du devis dans un nouvel onglet"
                                >
                                  <Receipt className="h-3 w-3" />
                                  Voir le devis
                                </a>
                                {entry.payment_link_url && (
                                  <a
                                    href={entry.payment_link_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    Ouvrir le lien de paiement
                                  </a>
                                )}
                                {entry.stripe_session_id && (
                                  <a
                                    href={buildStripeDashboardUrl(entry.stripe_session_id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Voir sur Stripe Dashboard
                                  </a>
                                )}
                                {relatedSchedule && (
                                  <a
                                    href={`/admin?section=quotes-invoices&quoteId=${quoteId}&scheduleId=${relatedSchedule.id}#schedule-${relatedSchedule.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                    title={`Ouvrir l'échéance ${relatedSchedule.installment_number}/${relatedSchedule.total_installments} • Statut : ${relatedSchedule.status} • ${Number(relatedSchedule.expected_amount).toFixed(2)}€`}
                                  >
                                    <Receipt className="h-3 w-3" />
                                    Voir l'échéance {relatedSchedule.installment_number}/{relatedSchedule.total_installments}
                                    <Badge
                                      variant={relatedSchedule.status === "paid" ? "default" : "outline"}
                                      className="text-[9px] py-0 ml-1"
                                    >
                                      {relatedSchedule.status}
                                    </Badge>
                                  </a>
                                )}
                              </div>

                              {/* Diff summary vs previous attempt for the same scope */}
                              {diffs.length > 0 && previousAttempt && (
                                <div className="mt-2 rounded-md border border-border/60 bg-background/50 p-2">
                                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-muted-foreground">
                                    <GitCompare className="h-3 w-3" />
                                    Changements depuis la tentative précédente
                                    <span className="text-muted-foreground/60">
                                      ({formatDistanceToNow(new Date(previousAttempt.created_at), { locale: fr })} plus tôt)
                                    </span>
                                  </div>
                                  <ul className="space-y-1 text-[11px]">
                                    {diffs.map((d) => (
                                      <li key={d.field} className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-muted-foreground">{d.field} :</span>
                                        <code className="bg-muted/70 px-1 rounded line-through opacity-70">
                                          {d.before}
                                        </code>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <code className="bg-primary/10 text-primary px-1 rounded font-medium">
                                          {d.after}
                                        </code>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>

                          <CollapsibleContent className="mt-3 pt-3 border-t border-border/50 space-y-1.5 text-xs">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div>
                                <span className="text-muted-foreground">Action brute :</span>{" "}
                                <code className="bg-muted px-1 rounded">{entry.action}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Statut :</span>{" "}
                                <code className="bg-muted px-1 rounded">{entry.status}</code>
                              </div>
                              {entry.stripe_session_id && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Stripe session :</span>{" "}
                                  <code className="bg-muted px-1 rounded text-[10px] break-all">
                                    {entry.stripe_session_id}
                                  </code>
                                </div>
                              )}
                              {relatedSchedule && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">ID échéance :</span>{" "}
                                  <code className="bg-muted px-1 rounded text-[10px] break-all">
                                    {relatedSchedule.id}
                                  </code>
                                </div>
                              )}
                              {entry.ip_address && (
                                <div>
                                  <span className="text-muted-foreground">IP :</span>{" "}
                                  <code className="bg-muted px-1 rounded">{entry.ip_address}</code>
                                </div>
                              )}
                              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Metadata :</span>
                                  <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-[10px]">
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentAttemptTimeline;
