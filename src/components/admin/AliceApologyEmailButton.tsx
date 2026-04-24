import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailWarning, Send } from "lucide-react";
import { toast } from "sonner";

const ALICE_RECIPIENT = "adamervalle@gmail.com";
const ALICE_NAME = "Alice Damervalle";
const ALICE_SUBJECT = "Régularisation de votre paiement en 3 fois — Toutes nos excuses";

const ALICE_DEFAULT_MESSAGE = `Bonjour Alice,

Nous tenions à revenir personnellement vers vous au sujet de votre dossier de paiement en 3 fois.

Suite à un défaut de configuration de notre côté, vous avez reçu un lien de paiement dont le montant ne correspondait pas à la répartition prévue (33,33% / 33,33% / 33,34%). Nous en sommes sincèrement désolés et tenons à vous présenter nos excuses pour la confusion occasionnée.

Soyez assurée que nous avons immédiatement mis tout en œuvre pour consolider notre système :
• Génération automatique des 3 liens de paiement à 33,33% / 33,33% / 33,34%, sans aucune intervention manuelle possible sur les montants.
• Validation côté serveur empêchant désormais l'envoi de tout lien dont le montant ne correspondrait pas à l'étape attendue.
• Tableau de suivi détaillé pour chaque versement (statut, date d'envoi, montant attendu, montant payé).
• Journal d'audit complet retraçant chaque tentative d'envoi, afin de prévenir et diagnostiquer toute anomalie similaire à l'avenir.

Votre dossier est maintenant entièrement régularisé. Vous recevrez prochainement les bons liens de paiement, conformément à ce qui était initialement prévu.

Encore une fois, toutes nos excuses pour ce désagrément. Nous restons à votre entière disposition pour toute question.

Très cordialement,`;

export function AliceApologyEmailButton() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(ALICE_RECIPIENT);
  const [subject, setSubject] = useState(ALICE_SUBJECT);
  const [message, setMessage] = useState(ALICE_DEFAULT_MESSAGE);

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast.error("Le destinataire et le message sont requis");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-reply", {
        body: {
          to: recipient.trim(),
          subject: subject.trim() || ALICE_SUBJECT,
          message: message.trim(),
          senderName: ALICE_NAME,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.deduplicated) {
        toast.info("Email déjà envoyé récemment (anti-doublon).");
      } else {
        toast.success(`Email d'excuse envoyé à ${recipient}.`);
      }
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Impossible d'envoyer l'email : ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setRecipient(ALICE_RECIPIENT);
    setSubject(ALICE_SUBJECT);
    setMessage(ALICE_DEFAULT_MESSAGE);
  };

  return (
    <Card className="border-accent bg-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MailWarning className="h-5 w-5 text-accent-foreground" />
          Email d'excuse — Cas Alice Damervalle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Texte d'excuse préparé suite à l'incident du paiement en 3 fois. Vous pouvez relire / modifier puis envoyer en un clic.
        </p>
        <div className="flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Send className="h-4 w-4" />
                Envoyer l'email d'excuse à Alice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Envoyer l'email d'excuse</DialogTitle>
                <DialogDescription>
                  Relisez le contenu avant envoi. Le message sera envoyé via votre adresse contact officielle, avec mise en page brandée.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="alice-recipient">Destinataire</Label>
                  <Input
                    id="alice-recipient"
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alice-subject">Sujet</Label>
                  <Input
                    id="alice-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alice-message">Message</Label>
                  <Textarea
                    id="alice-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={16}
                    disabled={sending}
                    className="font-sans text-sm leading-relaxed"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={handleReset} disabled={sending}>
                  Réinitialiser le texte
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                  Annuler
                </Button>
                <Button onClick={handleSend} disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Confirmer l'envoi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
