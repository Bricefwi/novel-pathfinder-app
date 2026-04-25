import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MailWarning, Send, Eye, Pencil, CheckCircle2, AlertTriangle, History, RefreshCw, Paperclip, X, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { buildBrandedEmailPreview } from "@/lib/email-preview";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface ApologyLogEntry {
  id: string;
  recipient: string;
  subject: string;
  sender_name: string | null;
  message_length: number;
  status: string;
  error_message: string | null;
  performed_by_email: string | null;
  created_at: string;
}

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  sent: { label: "Envoyé", className: "bg-primary/10 text-primary border-primary/20" },
  deduplicated: { label: "Doublon évité", className: "bg-muted text-muted-foreground border-border" },
  failed: { label: "Échec", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface AttachmentEntry {
  name: string;
  size: number;
  type: string;
  base64: string; // contenu base64 (sans préfixe data:)
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 Mo par fichier
const MAX_TOTAL_ATTACHMENTS_BYTES = 10 * 1024 * 1024; // 10 Mo total

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function AliceApologyEmailButton() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(ALICE_RECIPIENT);
  const [subject, setSubject] = useState(ALICE_SUBJECT);
  const [message, setMessage] = useState(ALICE_DEFAULT_MESSAGE);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [history, setHistory] = useState<ApologyLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedRecipient = recipient.trim();
  const trimmedSubject = subject.trim() || ALICE_SUBJECT;
  const trimmedMessage = message.trim();
  const charCount = trimmedMessage.length;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedRecipient);
  const canSend = isValidEmail && trimmedMessage.length > 0;
  const totalAttachmentsBytes = attachments.reduce((sum, a) => sum + a.size, 0);

  const previewHtml = useMemo(
    () =>
      buildBrandedEmailPreview({
        recipientName: ALICE_NAME.split(" ")[0],
        subject: subject || ALICE_SUBJECT,
        message: message || ALICE_DEFAULT_MESSAGE,
        senderName: ALICE_NAME,
        attachments: attachments.map((a) => ({ name: a.name, size: a.size, type: a.type })),
      }),
    [subject, message, attachments]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newEntries: AttachmentEntry[] = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`"${file.name}" dépasse la taille max (${formatBytes(MAX_ATTACHMENT_BYTES)}).`);
        continue;
      }
      if (totalAttachmentsBytes + newEntries.reduce((s, a) => s + a.size, 0) + file.size > MAX_TOTAL_ATTACHMENTS_BYTES) {
        toast.error(`Total des pièces jointes limité à ${formatBytes(MAX_TOTAL_ATTACHMENTS_BYTES)}.`);
        break;
      }
      try {
        const base64 = await fileToBase64(file);
        newEntries.push({ name: file.name, size: file.size, type: file.type || "application/octet-stream", base64 });
      } catch (err) {
        console.error("Erreur lecture fichier", err);
        toast.error(`Impossible de lire "${file.name}".`);
      }
    }
    if (newEntries.length > 0) {
      setAttachments((prev) => [...prev, ...newEntries]);
      toast.success(`${newEntries.length} pièce(s) jointe(s) ajoutée(s).`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await (supabase as any)
        .from("apology_email_log")
        .select("id, recipient, subject, sender_name, message_length, status, error_message, performed_by_email, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory((data ?? []) as ApologyLogEntry[]);
    } catch (err) {
      console.error("Failed to fetch apology email history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const logSend = async (status: string, errorMessage?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const performedBy = userData?.user?.id ?? null;
      const performedByEmail = userData?.user?.email ?? null;
      await (supabase as any).from("apology_email_log").insert({
        recipient: trimmedRecipient,
        subject: trimmedSubject,
        sender_name: ALICE_NAME,
        message_length: charCount,
        status,
        error_message: errorMessage ?? null,
        performed_by: performedBy,
        performed_by_email: performedByEmail,
        metadata: {
          source: "AliceApologyEmailButton",
          attachments_count: attachments.length,
          attachments_total_bytes: totalAttachmentsBytes,
          attachments_names: attachments.map((a) => a.name),
        },
      });
    } catch (err) {
      console.error("Failed to log apology email send", err);
    }
  };

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
        await logSend("deduplicated");
        toast.info("Email déjà envoyé récemment (anti-doublon).");
      } else {
        await logSend("sent");
        toast.success(`Email d'excuse envoyé à ${recipient}.`);
      }
      setOpen(false);
      setConfirmOpen(false);
      fetchHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      await logSend("failed", msg);
      toast.error(`Impossible d'envoyer l'email : ${msg}`);
      fetchHistory();
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
      <CardContent className="space-y-4">
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
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Envoyer l'email d'excuse</DialogTitle>
                <DialogDescription>
                  Relisez le contenu et l'aperçu brandé avant envoi. Le message sera envoyé via votre adresse contact officielle.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" className="gap-2">
                    <Pencil className="h-4 w-4" /> Édition
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" /> Aperçu brandé
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="space-y-4 py-2">
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
                      rows={14}
                      disabled={sending}
                      className="font-sans text-sm leading-relaxed"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="preview" className="py-2">
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="flex items-center justify-between border-b bg-card px-4 py-2 text-xs text-muted-foreground">
                      <span>Aperçu exact du rendu Brevo (logo, couleurs, footer)</span>
                      <span className="font-mono">{recipient || "—"}</span>
                    </div>
                    <iframe
                      title="Aperçu de l'email d'excuse"
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ height: "60vh", backgroundColor: "#F5F3F0" }}
                      sandbox=""
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={handleReset} disabled={sending}>
                  Réinitialiser le texte
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                  Annuler
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={sending || !canSend}
                  className="gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Confirmer l'envoi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={confirmOpen} onOpenChange={(o) => !sending && setConfirmOpen(o)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Confirmer l'envoi de l'email
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Vérifiez le résumé ci-dessous avant l'envoi définitif. Cette action est irréversible.
                    </p>
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-foreground">Destinataire</span>
                        <span className="font-mono text-right break-all">{trimmedRecipient || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-foreground">Sujet</span>
                        <span className="text-right">{trimmedSubject}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-foreground">Expéditeur</span>
                        <span className="text-right">{ALICE_NAME}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-foreground">Caractères</span>
                        <span className="text-right font-mono">{charCount.toLocaleString("fr-FR")}</span>
                      </div>
                    </div>
                    {!isValidEmail && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="text-xs">L'adresse email du destinataire semble invalide.</span>
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sending}>Retour à l'édition</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  disabled={sending || !canSend}
                  className="gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer maintenant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Historique des envois */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <History className="h-4 w-4" />
              Historique des envois
              {history.length > 0 && (
                <Badge variant="outline" className="ml-1">
                  {history.length}
                </Badge>
              )}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="h-7 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
          {loadingHistory && history.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Chargement…
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucun envoi enregistré pour le moment.
            </p>
          ) : (
            <ScrollArea className="h-[280px] rounded-md border bg-card">
              <div className="divide-y divide-border">
                {history.map((entry) => {
                  const variant = STATUS_VARIANTS[entry.status] ?? {
                    label: entry.status,
                    className: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <div key={entry.id} className="p-3 space-y-1.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${variant.className}`}>
                              {variant.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              {format(new Date(entry.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate text-foreground">{entry.recipient}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.subject}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div className="font-mono">{entry.message_length} car.</div>
                        </div>
                      </div>
                      {entry.performed_by_email && (
                        <p className="text-xs text-muted-foreground">
                          Par <span className="font-medium">{entry.performed_by_email}</span>
                        </p>
                      )}
                      {entry.error_message && (
                        <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1 mt-1">
                          {entry.error_message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
