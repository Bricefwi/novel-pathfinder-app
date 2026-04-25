import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail, CheckCircle2, Clock, AlertTriangle, Calendar, Lock, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentAuditLog } from "./PaymentAuditLog";
import { PaymentAttemptTimeline } from "./PaymentAttemptTimeline";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentSchedule {
  id: string;
  installment_number: number;
  total_installments: number;
  expected_amount: number;
  percentage: number | null;
  status: "pending" | "link_sent" | "paid" | "cancelled" | "failed";
  due_date: string | null;
  link_sent_at: string | null;
  paid_at: string | null;
}

interface InstallmentPaymentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quote_number: string;
    client_name: string;
    client_email: string;
    activity_title: string;
    total_price: number;
    start_date: string | null;
  };
}

export const InstallmentPaymentManager = ({ open, onOpenChange, quote }: InstallmentPaymentManagerProps) => {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [totalInstallments] = useState(3);
  const [confirmInstallment, setConfirmInstallment] = useState<number | null>(null);
  const [amountConfirmed, setAmountConfirmed] = useState(false);
  
  // Suggested due dates for each installment (J0, J-30 before trip, J-7 before trip)
  const computeSuggestedDueDate = (n: number): string => {
    const today = new Date();
    if (!quote.start_date) {
      // Without trip date, spread over 60 days
      const target = new Date(today);
      target.setDate(today.getDate() + (n - 1) * 30);
      return target.toISOString().split("T")[0];
    }
    const startDate = new Date(quote.start_date);
    if (n === 1) return today.toISOString().split("T")[0];
    if (n === 2) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() - 30);
      return d.toISOString().split("T")[0];
    }
    const d = new Date(startDate);
    d.setDate(startDate.getDate() - 7);
    return d.toISOString().split("T")[0];
  };

  const baseInstallment = Math.floor((quote.total_price / totalInstallments) * 100) / 100;
  const lastInstallment = Math.round((quote.total_price - baseInstallment * (totalInstallments - 1)) * 100) / 100;
  
  const [dueDates, setDueDates] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {};
    for (let i = 1; i <= 3; i++) out[i] = computeSuggestedDueDate(i);
    return out;
  });

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_schedules")
      .select("*")
      .eq("quote_id", quote.id)
      .order("installment_number", { ascending: true });
    
    if (error) {
      toast.error(`Erreur de chargement: ${error.message}`);
      setLoading(false);
      return;
    }

    let existing = (data || []) as PaymentSchedule[];

    // === AUTO-PROVISION: Create missing schedule rows at 33.33% / 33.33% / 33.34% ===
    const missingRows = [1, 2, 3]
      .filter((n) => !existing.find((s) => s.installment_number === n && s.status !== "cancelled"))
      .map((n) => ({
        quote_id: quote.id,
        installment_number: n,
        total_installments: 3,
        expected_amount: n === 3 ? lastInstallment : baseInstallment,
        percentage: n === 3
          ? Math.round((lastInstallment / quote.total_price) * 10000) / 100
          : Math.round((baseInstallment / quote.total_price) * 10000) / 100,
        status: "pending" as const,
        due_date: computeSuggestedDueDate(n),
      }));

    if (missingRows.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("payment_schedules")
        .insert(missingRows)
        .select();
      if (insertErr) {
        toast.error(`Échéancier non initialisé: ${insertErr.message}`);
      } else if (inserted) {
        existing = [...existing, ...(inserted as PaymentSchedule[])].sort(
          (a, b) => a.installment_number - b.installment_number
        );
      }
    }

    setSchedules(existing);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchSchedules();
    }
  }, [open, quote.id]);

  const getScheduleForInstallment = (n: number) => schedules.find((s) => s.installment_number === n && s.status !== "cancelled");

  // Step 1: open the explicit confirmation dialog (validates pre-conditions)
  const requestSendInstallmentLink = (installmentNumber: number) => {
    if (sending !== null) {
      toast.warning("Un envoi est déjà en cours. Merci de patienter.");
      return;
    }
    const current = getScheduleForInstallment(installmentNumber);
    if (current?.status === "paid") {
      toast.error(`Ce versement (${installmentNumber}/${totalInstallments}) est déjà payé. Aucun nouveau lien ne peut être envoyé.`);
      return;
    }
    if (current?.status === "link_sent") {
      toast.error(
        `Un lien a déjà été envoyé pour ce versement le ${
          current.link_sent_at
            ? format(new Date(current.link_sent_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })
            : "—"
        }. Renvoi bloqué automatiquement (anti-doublon).`
      );
      return;
    }
    setAmountConfirmed(false);
    setConfirmInstallment(installmentNumber);
  };

  // Step 2: actual send (only callable after explicit UI confirmation)
  const confirmAndSendInstallmentLink = async () => {
    if (confirmInstallment === null) return;
    const installmentNumber = confirmInstallment;
    setSending(installmentNumber);
    try {
      const { data, error } = await supabase.functions.invoke("create-installment-payment", {
        body: {
          quote_id: quote.id,
          installment_number: installmentNumber,
          total_installments: totalInstallments,
          due_date: dueDates[installmentNumber],
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Lien versement ${installmentNumber}/${totalInstallments} envoyé à ${quote.client_email}`, {
        description: `Montant: ${data.amount}€`,
      });
      setConfirmInstallment(null);
      setAmountConfirmed(false);
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec: ${msg}`);
    } finally {
      setSending(null);
    }
  };

  const totalPaid = schedules
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + Number(s.expected_amount), 0);
  const totalPending = schedules
    .filter((s) => s.status === "link_sent" || s.status === "pending")
    .reduce((sum, s) => sum + Number(s.expected_amount), 0);

  const renderStatus = (s: PaymentSchedule | undefined) => {
    if (!s) return <Badge variant="outline" className="bg-muted">Non envoyé</Badge>;
    if (s.status === "paid") return <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />Payé</Badge>;
    if (s.status === "link_sent") return <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />Lien envoyé</Badge>;
    if (s.status === "failed") return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Échec</Badge>;
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Échéancier de paiement en {totalInstallments} fois
          </DialogTitle>
          <DialogDescription>
            Devis <strong>{quote.quote_number}</strong> – {quote.client_name} ({quote.client_email})
            <br />
            Total: <strong>{quote.total_price}€</strong> • Activité: {quote.activity_title}
          </DialogDescription>
        </DialogHeader>

        {/* Récapitulatif */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Déjà payé</p>
              <p className="text-2xl font-bold text-primary">{totalPaid.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30 border-secondary">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-secondary-foreground">{totalPending.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Restant à programmer</p>
              <p className="text-2xl font-bold">{(quote.total_price - totalPaid - totalPending).toFixed(2)}€</p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau de suivi détaillé */}
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Suivi détaillé des versements
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Versement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date d'envoi</TableHead>
                <TableHead>Date de paiement</TableHead>
                <TableHead className="text-right">Montant attendu</TableHead>
                <TableHead className="text-right">Montant payé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((n) => {
                const s = getScheduleForInstallment(n);
                const expected = n === 3 ? lastInstallment : baseInstallment;
                const paidAmount = s?.status === "paid" ? Number(s.expected_amount) : 0;
                return (
                  <TableRow key={`row-${n}`}>
                    <TableCell className="font-medium">{n}/{totalInstallments}</TableCell>
                    <TableCell>{renderStatus(s)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s?.link_sent_at
                        ? format(new Date(s.link_sent_at), "dd/MM/yyyy HH:mm", { locale: fr })
                        : <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s?.paid_at
                        ? format(new Date(s.paid_at), "dd/MM/yyyy HH:mm", { locale: fr })
                        : <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{expected.toFixed(2)}€</TableCell>
                    <TableCell className="text-right font-semibold">
                      {paidAmount > 0
                        ? <span className="text-primary">{paidAmount.toFixed(2)}€</span>
                        : <span className="text-muted-foreground">0,00€</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={4} className="text-right">Total</TableCell>
                <TableCell className="text-right">{quote.total_price.toFixed(2)}€</TableCell>
                <TableCell className="text-right text-primary">{totalPaid.toFixed(2)}€</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        {/* Garde-fou visuel */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-medium mb-1">🛡️ Sécurité automatique activée</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-5">
            <li>Chaque versement est calculé automatiquement à 33,33% du total</li>
            <li>Impossible d'envoyer 2 fois le même versement (numéro unique)</li>
            <li>Si un versement est déjà payé, son lien est bloqué</li>
            <li>La somme des versements ne peut pas dépasser le total du devis</li>
          </ul>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((n) => {
              const schedule = getScheduleForInstallment(n);
              const expectedAmount = n === 3 ? lastInstallment : baseInstallment;
              const isPaid = schedule?.status === "paid";
              const isLinkSent = schedule?.status === "link_sent";
              
              return (
                <Card key={n} className={isPaid ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {n}
                        </div>
                        <div>
                          <p className="font-semibold">Versement {n} sur {totalInstallments}</p>
                          <p className="text-sm text-muted-foreground">
                            {expectedAmount.toFixed(2)}€ ({((expectedAmount / quote.total_price) * 100).toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                      {renderStatus(schedule)}
                    </div>

                    {schedule?.paid_at && (
                      <p className="text-xs text-primary mb-2">
                        ✓ Payé le {format(new Date(schedule.paid_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    )}
                    {schedule?.link_sent_at && !isPaid && (
                      <p className="text-xs text-muted-foreground mb-2">
                        ✉️ Lien envoyé le {format(new Date(schedule.link_sent_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    )}

                    {!isPaid && (
                      <div className="flex items-end gap-2 mt-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Date limite (suggérée)</Label>
                          <Input
                            type="date"
                            value={dueDates[n]}
                            onChange={(e) => setDueDates((prev) => ({ ...prev, [n]: e.target.value }))}
                            className="h-9"
                            disabled={isLinkSent}
                          />
                        </div>
                        <Button
                          onClick={() => sendInstallmentLink(n)}
                          disabled={sending !== null || isLinkSent}
                          size="sm"
                          variant={isLinkSent ? "outline" : "default"}
                          title={
                            isLinkSent
                              ? "Renvoi bloqué : un lien a déjà été envoyé pour ce versement (anti-doublon automatique)."
                              : undefined
                          }
                        >
                          {sending === n ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isLinkSent ? (
                            <>
                              <Lock className="h-4 w-4 mr-1.5" />
                              Lien déjà envoyé
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-1.5" />
                              Envoyer le lien
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {isLinkSent && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        🛡️ Renvoi bloqué automatiquement. Pour renvoyer ce versement, contactez un super-admin ou annulez l'échéance existante.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Journal d'audit contextualisé : timeline + tableau détaillé */}
        <div className="mt-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">📍 Chronologie</TabsTrigger>
              <TabsTrigger value="table">📋 Détail tableau</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-3">
              <PaymentAttemptTimeline quoteId={quote.id} />
            </TabsContent>
            <TabsContent value="table" className="mt-3">
              <PaymentAuditLog quoteId={quote.id} />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
