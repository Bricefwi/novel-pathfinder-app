import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";
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
    } else {
      setSchedules((data || []) as PaymentSchedule[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchSchedules();
    }
  }, [open, quote.id]);

  const getScheduleForInstallment = (n: number) => schedules.find((s) => s.installment_number === n && s.status !== "cancelled");

  const sendInstallmentLink = async (installmentNumber: number) => {
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
    if (s.status === "paid") return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Payé</Badge>;
    if (s.status === "link_sent") return <Badge className="bg-blue-500"><Mail className="h-3 w-3 mr-1" />Lien envoyé</Badge>;
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
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Déjà payé</p>
              <p className="text-2xl font-bold text-green-700">{totalPaid.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-blue-700">{totalPending.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Restant à programmer</p>
              <p className="text-2xl font-bold">{(quote.total_price - totalPaid - totalPending).toFixed(2)}€</p>
            </CardContent>
          </Card>
        </div>

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
                <Card key={n} className={isPaid ? "border-green-300 bg-green-50/50 dark:bg-green-950/10" : ""}>
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
                      <p className="text-xs text-green-700 mb-2">
                        ✓ Payé le {format(new Date(schedule.paid_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    )}
                    {schedule?.link_sent_at && !isPaid && (
                      <p className="text-xs text-blue-700 mb-2">
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
                          />
                        </div>
                        <Button
                          onClick={() => sendInstallmentLink(n)}
                          disabled={sending !== null}
                          size="sm"
                          variant={isLinkSent ? "outline" : "default"}
                        >
                          {sending === n ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-1.5" />
                              {isLinkSent ? "Renvoyer le lien" : "Envoyer le lien"}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
