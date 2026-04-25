import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MailWarning, Send, Eye, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
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

const LAST_SENT_KEY = "alice-apology-last-sent";

interface LastSent {
  recipient: string;
  subject: string;
  message: string;
  sentAt: string;
}

// Extract key mentions (amounts, percentages) from message
function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  const percentRegex = /\d+[.,]?\d*\s*%/g;
  const amountRegex = /\d+[.,]?\d*\s*(?:€|EUR|euros?)/gi;
  const fractionRegex = /\b(?:en\s+)?\d+\s+fois\b/gi;
  [percentRegex, amountRegex, fractionRegex].forEach((re) => {
    const matches = text.match(re);
    if (matches) mentions.push(...matches);
  });
  return Array.from(new Set(mentions));
}

// Compare two strings line by line — return added/removed/changed
function diffLines(prev: string, current: string) {
  const prevLines = prev.split("\n");
  const curLines = current.split("\n");
  const prevSet = new Set(prevLines.map((l) => l.trim()).filter(Boolean));
  const curSet = new Set(curLines.map((l) => l.trim()).filter(Boolean));
  const added = curLines.filter((l) => l.trim() && !prevSet.has(l.trim()));
  const removed = prevLines.filter((l) => l.trim() && !curSet.has(l.trim()));
  return { added, removed };
}

export function AliceApologyEmailButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(ALICE_RECIPIENT);
  const [subject, setSubject] = useState(ALICE_SUBJECT);
  const [message, setMessage] = useState(ALICE_DEFAULT_MESSAGE);
  const [lastSent, setLastSent] = useState<LastSent | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_SENT_KEY);
      if (raw) setLastSent(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [open]);

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
      // Persist last sent payload for diff on next open
      const payload: LastSent = {
        recipient: recipient.trim(),
        subject: subject.trim() || ALICE_SUBJECT,
        message: message.trim(),
        sentAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LAST_SENT_KEY, JSON.stringify(payload));
        setLastSent(payload);
      } catch {
        // ignore
      }
      setOpen(false);
      setStep("edit");
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

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setStep("edit");
  };

  const currentMentions = extractMentions(`${subject}\n${message}`);
  const previousMentions = lastSent ? extractMentions(`${lastSent.subject}\n${lastSent.message}`) : [];
  const newMentions = currentMentions.filter((m) => !previousMentions.includes(m));
  const removedMentions = previousMentions.filter((m) => !currentMentions.includes(m));

  const recipientChanged = lastSent && lastSent.recipient !== recipient.trim();
  const subjectChanged = lastSent && lastSent.subject !== subject.trim();
  const messageDiff = lastSent ? diffLines(lastSent.message, message) : { added: [], removed: [] };
  const hasChanges =
    !lastSent ||
    recipientChanged ||
    subjectChanged ||
    messageDiff.added.length > 0 ||
    messageDiff.removed.length > 0;

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
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Send className="h-4 w-4" />
                Envoyer l'email d'excuse à Alice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {step === "edit" ? "Préparer l'email d'excuse" : "Aperçu final avant envoi"}
                </DialogTitle>
                <DialogDescription>
                  {step === "edit"
                    ? "Relisez le contenu, puis passez à l'aperçu final."
                    : "Vérifiez le destinataire, le sujet et les mentions clés. Comparez avec la dernière tentative."}
                </DialogDescription>
              </DialogHeader>

              {step === "edit" ? (
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
              ) : (
                <div className="space-y-4 py-2">
                  {/* Final preview card */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2 text-sm">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Destinataire
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs">{recipient.trim()}</span>
                            {recipientChanged && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500 text-amber-700">
                                Modifié
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Sujet
                          </span>
                          <div className="flex items-start gap-2 mt-0.5">
                            <span className="text-xs">{subject.trim() || ALICE_SUBJECT}</span>
                            {subjectChanged && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500 text-amber-700 shrink-0">
                                Modifié
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key mentions */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Mentions clés détectées (montants / pourcentages)
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentMentions.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Aucune mention chiffrée détectée</span>
                        ) : (
                          currentMentions.map((m, i) => {
                            const isNew = newMentions.includes(m);
                            return (
                              <Badge
                                key={`${m}-${i}`}
                                variant={isNew ? "default" : "secondary"}
                                className="text-[10px] h-5"
                              >
                                {m}
                                {isNew && lastSent && <span className="ml-1 opacity-70">(nouveau)</span>}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                      {removedMentions.length > 0 && (
                        <div className="mt-1.5">
                          <span className="text-[10px] text-muted-foreground">Retirées : </span>
                          {removedMentions.map((m, i) => (
                            <Badge key={`r-${m}-${i}`} variant="outline" className="text-[10px] h-5 line-through opacity-60 mr-1">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Changes summary vs last attempt */}
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {hasChanges ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="text-xs font-semibold">
                        {!lastSent
                          ? "Premier envoi (aucune tentative précédente)"
                          : hasChanges
                            ? "Changements par rapport à la dernière tentative"
                            : "Identique à la dernière tentative"}
                      </span>
                    </div>
                    {lastSent && (
                      <div className="text-[10px] text-muted-foreground">
                        Dernière tentative : {new Date(lastSent.sentAt).toLocaleString("fr-FR")}
                      </div>
                    )}
                    {lastSent && hasChanges && (
                      <div className="space-y-1.5 text-xs">
                        {recipientChanged && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground shrink-0">Destinataire :</span>
                            <span className="line-through opacity-60">{lastSent.recipient}</span>
                            <span>→</span>
                            <span className="font-medium">{recipient.trim()}</span>
                          </div>
                        )}
                        {subjectChanged && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground">Sujet modifié :</span>
                            <span className="line-through opacity-60 text-[11px]">{lastSent.subject}</span>
                            <span className="font-medium text-[11px]">→ {subject.trim()}</span>
                          </div>
                        )}
                        {messageDiff.added.length > 0 && (
                          <div>
                            <span className="text-emerald-700 font-medium">+ {messageDiff.added.length} ligne(s) ajoutée(s)</span>
                            <ul className="mt-0.5 ml-3 space-y-0.5">
                              {messageDiff.added.slice(0, 3).map((l, i) => (
                                <li key={i} className="text-[10px] text-emerald-700/80 truncate">
                                  + {l.slice(0, 90)}{l.length > 90 ? "…" : ""}
                                </li>
                              ))}
                              {messageDiff.added.length > 3 && (
                                <li className="text-[10px] text-muted-foreground italic">
                                  … et {messageDiff.added.length - 3} de plus
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        {messageDiff.removed.length > 0 && (
                          <div>
                            <span className="text-rose-700 font-medium">− {messageDiff.removed.length} ligne(s) retirée(s)</span>
                            <ul className="mt-0.5 ml-3 space-y-0.5">
                              {messageDiff.removed.slice(0, 3).map((l, i) => (
                                <li key={i} className="text-[10px] text-rose-700/80 truncate line-through">
                                  − {l.slice(0, 90)}{l.length > 90 ? "…" : ""}
                                </li>
                              ))}
                              {messageDiff.removed.length > 3 && (
                                <li className="text-[10px] text-muted-foreground italic">
                                  … et {messageDiff.removed.length - 3} de plus
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body preview */}
                  <details className="rounded-lg border border-border bg-card">
                    <summary className="cursor-pointer p-3 text-xs font-semibold hover:bg-muted/30">
                      Voir le corps complet du message
                    </summary>
                    <div className="p-3 pt-0 text-xs whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground max-h-64 overflow-y-auto">
                      {message}
                    </div>
                  </details>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                {step === "edit" ? (
                  <>
                    <Button variant="ghost" onClick={handleReset} disabled={sending}>
                      Réinitialiser le texte
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                      Annuler
                    </Button>
                    <Button onClick={() => setStep("preview")} disabled={sending} className="gap-2">
                      <Eye className="h-4 w-4" />
                      Aperçu final
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setStep("edit")} disabled={sending} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Retour à l'édition
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                      Annuler
                    </Button>
                    <Button onClick={handleSend} disabled={sending} className="gap-2">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Confirmer l'envoi
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
