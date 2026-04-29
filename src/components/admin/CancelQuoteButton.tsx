import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CancelQuoteButtonProps {
  quote: {
    id: string;
    quote_number: string;
    client_name: string;
    client_email: string;
    activity_title: string;
    status: string | null;
    total_price: number | string;
  };
}

const NON_CANCELLABLE = ["cancelled", "paid", "partial"];

export const CancelQuoteButton = ({ quote }: CancelQuoteButtonProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const isDisabled = NON_CANCELLABLE.includes(quote.status || "");

  const handleCancel = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Merci d'indiquer un motif d'annulation (5 caractères min.)");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-quote", {
        body: {
          quote_id: quote.id,
          reason: reason.trim(),
          send_email: sendEmail,
          custom_message: customMessage.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (sendEmail && data?.email_sent) {
        toast.success(`Devis ${quote.quote_number} annulé. Email envoyé au client.`);
      } else if (sendEmail && !data?.email_sent) {
        toast.warning(`Devis annulé, mais l'email n'a pas pu être envoyé : ${data?.email_error || "raison inconnue"}`);
      } else {
        toast.success(`Devis ${quote.quote_number} annulé (sans email).`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setOpen(false);
      setReason("");
      setCustomMessage("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Impossible d'annuler le devis : ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        title={
          isDisabled
            ? quote.status === "cancelled"
              ? "Devis déjà annulé"
              : "Impossible : devis déjà payé ou partiellement payé"
            : "Annuler ce devis"
        }
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Ban className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Annuler le devis {quote.quote_number}
            </DialogTitle>
            <DialogDescription>
              Cette action marquera le devis comme annulé et arrêtera toutes les relances automatiques.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">Client :</span> <strong>{quote.client_name}</strong></div>
              <div><span className="text-muted-foreground">Email :</span> {quote.client_email}</div>
              <div><span className="text-muted-foreground">Séjour :</span> {quote.activity_title}</div>
              <div><span className="text-muted-foreground">Montant :</span> {Number(quote.total_price).toFixed(2)} €</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Motif de l'annulation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : Doublon de la demande DEV-2026-0010 / Annulation à la demande du client / Erreur de saisie…"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{reason.length}/500 caractères (interne, non envoyé tel quel au client)</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={(c) => setSendEmail(c === true)}
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor="send-email" className="cursor-pointer">
                  Prévenir le client par email (recommandé)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Un email brandé sera envoyé à <strong>{quote.client_email}</strong> pour expliquer que ce devis n'est plus valable.
                </p>
              </div>
            </div>

            {sendEmail && (
              <div className="space-y-2">
                <Label htmlFor="custom-message">Message personnalisé (optionnel)</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ex : Suite à votre nouvelle demande, ce premier devis n'est plus valable. Le devis en cours est le DEV-2026-0010 sur lequel vous avez déjà reçu votre lien de paiement."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Si vide, un message standard sera utilisé. {customMessage.length}/1000
                </p>
              </div>
            )}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Les éventuels échéanciers de paiement non réglés liés à ce devis seront également annulés.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading || !reason.trim() || reason.trim().length < 5}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Annulation…</>
              ) : (
                <><Ban className="h-4 w-4 mr-2" />Confirmer l'annulation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
