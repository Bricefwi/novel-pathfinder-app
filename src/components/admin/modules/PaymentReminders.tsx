import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Clock, Bell, BellRing, Send, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentAuditLog } from "@/components/admin/PaymentAuditLog";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  activity_title: string;
  total_amount: number;
  amount_paid: number | null;
  due_date: string | null;
  payment_status: string | null;
  status: string | null;
  start_date: string | null;
}

interface EmailAuditEntry {
  id: string;
  recipient: string;
  subject: string | null;
  type: string;
  status: string | null;
  sent_at: string | null;
  reference_id: string | null;
  error_message: string | null;
}

const STAGES = [
  { tag: "j-14", label: "J-14", delay: "2 semaines avant", icon: Bell, color: "bg-blue-500/10 text-blue-700 border-blue-500/30", urgency: "Informatif" },
  { tag: "j-7", label: "J-7", delay: "1 semaine avant", icon: Clock, color: "bg-orange-500/10 text-orange-700 border-orange-500/30", urgency: "Avertissement" },
  { tag: "j-3", label: "J-3", delay: "3 jours avant", icon: AlertTriangle, color: "bg-amber-500/10 text-amber-700 border-amber-500/30", urgency: "Urgent" },
  { tag: "j-1", label: "J-1", delay: "Veille de l'échéance", icon: BellRing, color: "bg-destructive/10 text-destructive border-destructive/30", urgency: "Critique" },
];

function getStageForInvoice(dueDate: string): typeof STAGES[number] | null {
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days <= 1) return STAGES[3];
  if (days <= 3) return STAGES[2];
  if (days <= 7) return STAGES[1];
  if (days <= 14) return STAGES[0];
  return null;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function PaymentReminders() {
  const [isRunning, setIsRunning] = useState(false);

  // Fetch invoices with pending balance
  const { data: invoices, isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["admin-payment-reminders-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .in("payment_status", ["pending", "partial", "unpaid"])
        .not("status", "eq", "cancelled")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  // Fetch reminder emails from audit log
  const { data: reminderEmails, isLoading: loadingEmails, refetch: refetchEmails } = useQuery({
    queryKey: ["admin-payment-reminder-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_audit_log")
        .select("*")
        .eq("type", "reminder")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmailAuditEntry[];
    },
  });

  const handleRunReminders = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("rappel-paiement");
      if (error) throw error;
      if (data?.success) {
        toast.success(`${data.sent} rappel(s) envoyé(s) sur ${data.total} factures vérifiées`);
        refetchInvoices();
        refetchEmails();
      } else {
        toast.error(data?.error || "Erreur lors de l'exécution");
      }
    } catch (err) {
      toast.error("Impossible d'exécuter les rappels");
    } finally {
      setIsRunning(false);
    }
  };

  const pendingInvoices = invoices?.filter(inv => {
    const remaining = inv.total_amount - (inv.amount_paid || 0);
    return remaining > 0 && inv.due_date;
  }) || [];

  const totalRemaining = pendingInvoices.reduce((sum, inv) => sum + inv.total_amount - (inv.amount_paid || 0), 0);
  const criticalCount = pendingInvoices.filter(inv => inv.due_date && differenceInDays(parseISO(inv.due_date), new Date()) <= 3).length;
  const sentToday = reminderEmails?.filter(e => e.sent_at && format(parseISO(e.sent_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length || 0;

  // Build stage tracking per invoice
  const stageMap = new Map<string, Set<string>>();
  reminderEmails?.forEach(e => {
    if (e.reference_id && e.subject && e.status === "sent") {
      STAGES.forEach(s => {
        if (e.subject?.includes(`[${s.tag}]`)) {
          if (!stageMap.has(e.reference_id!)) stageMap.set(e.reference_id!, new Set());
          stageMap.get(e.reference_id!)!.add(s.tag);
        }
      });
    }
  });

  if (loadingInvoices || loadingEmails) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Relances de Paiement</h1>
          <p className="text-muted-foreground text-sm">Suivi des rappels automatiques multi-paliers</p>
        </div>
        <Button onClick={handleRunReminders} disabled={isRunning}>
          {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Exécuter les rappels
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Bell className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{pendingInvoices.length}</p>
                <p className="text-xs text-muted-foreground">Factures en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Échéances critiques (≤3j)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent"><Send className="h-5 w-5 text-accent-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{sentToday}</p>
                <p className="text-xs text-muted-foreground">Rappels envoyés aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20"><Clock className="h-5 w-5 text-secondary-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalRemaining)}</p>
                <p className="text-xs text-muted-foreground">Solde total à recouvrer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stages Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paliers de Relance Automatique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAGES.map(stage => (
              <div key={stage.tag} className={`flex items-center gap-3 p-3 rounded-lg border ${stage.color}`}>
                <stage.icon className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{stage.label}</p>
                  <p className="text-xs opacity-80">{stage.delay}</p>
                  <p className="text-[10px] font-medium mt-0.5">{stage.urgency}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Factures en attente ({pendingInvoices.length})</TabsTrigger>
          <TabsTrigger value="history">Historique des rappels ({reminderEmails?.length || 0})</TabsTrigger>
          <TabsTrigger value="audit">🛡️ Audit liens paiement</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Palier actuel</TableHead>
                    <TableHead>Rappels envoyés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Aucune facture en attente de paiement
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingInvoices.map(inv => {
                      const remaining = inv.total_amount - (inv.amount_paid || 0);
                      const currentStage = inv.due_date ? getStageForInvoice(inv.due_date) : null;
                      const daysLeft = inv.due_date ? differenceInDays(parseISO(inv.due_date), new Date()) : null;
                      const sentStages = stageMap.get(inv.id) || new Set();

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{inv.client_name}</p>
                              <p className="text-xs text-muted-foreground">{inv.client_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">{inv.activity_title}</TableCell>
                          <TableCell className="text-right font-medium">{formatPrice(inv.total_amount)}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(inv.amount_paid || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-destructive">{formatPrice(remaining)}</TableCell>
                          <TableCell>
                            {inv.due_date ? (
                              <div>
                                <p className="text-sm">{format(parseISO(inv.due_date), "dd MMM yyyy", { locale: fr })}</p>
                                <p className={`text-xs ${daysLeft !== null && daysLeft <= 3 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                  {daysLeft !== null ? (daysLeft <= 0 ? "Échu" : `dans ${daysLeft}j`) : "—"}
                                </p>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {currentStage ? (
                              <Badge variant="outline" className={currentStage.color}>
                                {currentStage.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Hors palier</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {STAGES.map(s => (
                                <span
                                  key={s.tag}
                                  title={`${s.label} — ${sentStages.has(s.tag) ? "Envoyé" : "Non envoyé"}`}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold border ${
                                    sentStages.has(s.tag)
                                      ? "bg-green-500/20 text-green-700 border-green-500/40"
                                      : "bg-muted text-muted-foreground border-border"
                                  }`}
                                >
                                  {s.tag.replace("j-", "")}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!reminderEmails || reminderEmails.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun rappel envoyé pour l'instant
                      </TableCell>
                    </TableRow>
                  ) : (
                    reminderEmails.map(email => (
                      <TableRow key={email.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {email.sent_at ? format(parseISO(email.sent_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{email.recipient}</TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{email.subject || "—"}</TableCell>
                        <TableCell>
                          {email.status === "sent" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Envoyé
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                              <XCircle className="h-3 w-3" /> Échec
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                          {email.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
