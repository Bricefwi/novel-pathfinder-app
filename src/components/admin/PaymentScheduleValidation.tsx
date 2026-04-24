import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import { format, addDays, differenceInDays, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export interface InstallmentDraft {
  installment_number: number;
  expected_amount: number;
  due_date: string; // YYYY-MM-DD
}

interface PaymentScheduleValidationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalPrice: number;
  totalInstallments: number;
  clientName: string;
  quoteNumber: string;
  /** Called when admin confirms the schedule (after all checks pass) */
  onConfirm: (drafts: InstallmentDraft[]) => Promise<void> | void;
}

/**
 * Écran de validation des échéances avant envoi des liens de paiement.
 * - Propose par défaut J0, J+30, J+37 (compatible législation acompte + solde fractionné)
 * - Permet d'ajuster montants et dates
 * - Vérifie : somme = total, dates chronologiques, pas de date dans le passé (sauf J0)
 */
export const PaymentScheduleValidation = ({
  open,
  onOpenChange,
  totalPrice,
  totalInstallments,
  clientName,
  quoteNumber,
  onConfirm,
}: PaymentScheduleValidationProps) => {
  // === Valeurs par défaut : montants équirépartis avec arrondi sur le dernier ===
  const buildDefaults = useMemo<InstallmentDraft[]>(() => {
    const today = startOfDay(new Date());
    const base = Math.floor((totalPrice / totalInstallments) * 100) / 100;
    const last = Math.round((totalPrice - base * (totalInstallments - 1)) * 100) / 100;
    const offsets = totalInstallments === 3 ? [0, 30, 37] : [0, 30, 60, 90].slice(0, totalInstallments);
    return Array.from({ length: totalInstallments }, (_, i) => ({
      installment_number: i + 1,
      expected_amount: i === totalInstallments - 1 ? last : base,
      due_date: format(addDays(today, offsets[i] ?? i * 30), "yyyy-MM-dd"),
    }));
  }, [totalPrice, totalInstallments]);

  const [drafts, setDrafts] = useState<InstallmentDraft[]>(buildDefaults);
  const [submitting, setSubmitting] = useState(false);

  // Re-sync defaults when opening or when total changes
  useEffect(() => {
    if (open) setDrafts(buildDefaults);
  }, [open, buildDefaults]);

  const updateAmount = (n: number, value: string) => {
    const num = parseFloat(value.replace(",", "."));
    setDrafts((prev) =>
      prev.map((d) => (d.installment_number === n ? { ...d, expected_amount: isNaN(num) ? 0 : num } : d))
    );
  };

  const updateDate = (n: number, value: string) => {
    setDrafts((prev) => prev.map((d) => (d.installment_number === n ? { ...d, due_date: value } : d)));
  };

  const resetToDefaults = () => setDrafts(buildDefaults);

  // === Validations ===
  const sumAmounts = drafts.reduce((s, d) => s + (Number(d.expected_amount) || 0), 0);
  const sumRounded = Math.round(sumAmounts * 100) / 100;
  const totalRounded = Math.round(totalPrice * 100) / 100;
  const sumMatches = Math.abs(sumRounded - totalRounded) < 0.01;
  const sumDelta = Math.round((sumRounded - totalRounded) * 100) / 100;

  const today = startOfDay(new Date());
  const datesChronological = drafts.every((d, i) => {
    if (i === 0) return true;
    return !isBefore(new Date(d.due_date), new Date(drafts[i - 1].due_date));
  });
  const noPastDates = drafts.every((d, i) => {
    // J0 may equal today; subsequent dates must not be in the past
    if (i === 0) return true;
    return !isBefore(startOfDay(new Date(d.due_date)), today);
  });
  const allAmountsPositive = drafts.every((d) => Number(d.expected_amount) > 0);

  const canConfirm = sumMatches && datesChronological && noPastDates && allAmountsPositive && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm(drafts);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Validation de l'échéancier avant envoi
          </DialogTitle>
          <DialogDescription>
            Devis <strong>{quoteNumber}</strong> — {clientName} • Total : <strong>{totalRounded.toFixed(2)} €</strong>
            <br />
            Vérifiez les dates et montants proposés. Vous pouvez les ajuster avant l'envoi des liens de paiement.
          </DialogDescription>
        </DialogHeader>

        {/* Légende des dates par défaut */}
        <Alert className="bg-primary/5 border-primary/20">
          <Calendar className="h-4 w-4 text-primary" />
          <AlertTitle className="text-sm">Dates par défaut proposées</AlertTitle>
          <AlertDescription className="text-xs">
            <strong>J0</strong> (aujourd'hui), <strong>J+30</strong> (un mois), <strong>J+37</strong> (un mois + 7 jours).
            Ce calendrier respecte la loi française sur l'acompte initial et le solde fractionné.
          </AlertDescription>
        </Alert>

        {/* Lignes éditables */}
        <div className="space-y-2">
          {drafts.map((d, i) => {
            const offsetDays = differenceInDays(new Date(d.due_date), today);
            const offsetLabel = offsetDays === 0 ? "J0" : offsetDays > 0 ? `J+${offsetDays}` : `J${offsetDays}`;
            const isPast = i > 0 && isBefore(startOfDay(new Date(d.due_date)), today);
            const isOutOfOrder =
              i > 0 && isBefore(new Date(d.due_date), new Date(drafts[i - 1].due_date));
            const amountInvalid = !(Number(d.expected_amount) > 0);

            return (
              <Card key={d.installment_number} className={isPast || isOutOfOrder || amountInvalid ? "border-destructive/40" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                        {d.installment_number}
                      </div>
                      <p className="font-medium text-sm">
                        Versement {d.installment_number}/{totalInstallments}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {offsetLabel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date d'échéance</Label>
                      <Input
                        type="date"
                        value={d.due_date}
                        onChange={(e) => updateDate(d.installment_number, e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Montant (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.expected_amount}
                        onChange={(e) => updateAmount(d.installment_number, e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Erreurs de ligne */}
                  {(isPast || isOutOfOrder || amountInvalid) && (
                    <ul className="mt-2 text-xs text-destructive space-y-0.5 list-disc pl-5">
                      {isPast && <li>Cette date est dans le passé.</li>}
                      {isOutOfOrder && <li>Date antérieure au versement précédent.</li>}
                      {amountInvalid && <li>Le montant doit être strictement positif.</li>}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Récapitulatif des montants + contrôle de la somme */}
        <Card className={sumMatches ? "border-primary/40 bg-primary/5" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                {sumMatches ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                Contrôle de la somme
              </p>
              <Badge variant={sumMatches ? "default" : "destructive"}>
                {sumMatches ? "✓ Conforme" : "✗ Non conforme"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Somme saisie</p>
                <p className="font-bold">{sumRounded.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total devis</p>
                <p className="font-bold">{totalRounded.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Écart</p>
                <p className={`font-bold ${sumMatches ? "text-primary" : "text-destructive"}`}>
                  {sumDelta > 0 ? "+" : ""}
                  {sumDelta.toFixed(2)} €
                </p>
              </div>
            </div>
            {!sumMatches && (
              <p className="text-xs text-destructive mt-2">
                ⚠️ La somme des versements doit correspondre exactement au total du devis (tolérance 1 centime).
              </p>
            )}
          </CardContent>
        </Card>

        {/* Récap erreurs globales */}
        {(!datesChronological || !noPastDates) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Erreurs de dates</AlertTitle>
            <AlertDescription className="text-xs">
              {!datesChronological && <div>• Les dates doivent être dans l'ordre chronologique.</div>}
              {!noPastDates && <div>• Aucune date (hors J0) ne doit être dans le passé.</div>}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={resetToDefaults} disabled={submitting}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Réinitialiser
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            title={
              !sumMatches
                ? "La somme ne correspond pas au total du devis"
                : !datesChronological
                  ? "Les dates ne sont pas dans l'ordre"
                  : !noPastDates
                    ? "Au moins une date est dans le passé"
                    : !allAmountsPositive
                      ? "Tous les montants doivent être positifs"
                      : undefined
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Valider et préparer les envois
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
