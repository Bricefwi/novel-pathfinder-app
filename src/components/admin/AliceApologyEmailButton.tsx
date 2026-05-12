import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Loader2, MailWarning, Send, Eye, Pencil, CheckCircle2, AlertTriangle, History, RefreshCw, XCircle, RotateCw, Wifi, ShieldAlert, Clock, Server } from "lucide-react";
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
const ALICE_SUBJECT = "Régularisation de votre réservation Bretagne Romantique — Lien de paiement du solde";

const ALICE_DEFAULT_MESSAGE = `Bonjour Alice,

Nous revenons vers vous concernant votre séjour « Bretagne Romantique » du 7 au 11 mai 2026.

Votre acompte de 204 € a bien été reçu sur le tarif total de 680 €. Il vous reste donc un solde de 476 € à régler.

Suite aux récentes mises à jour de notre système de réservation, vous pouvez désormais demander vous-même votre lien de paiement sécurisé pour le solde restant, directement depuis votre espace client (Mon Espace → Mes Documents).

Si vous préférez, nous pouvons également vous générer ce lien manuellement sur simple demande par email ou au 06 59 22 62 70.

Nous restons à votre entière disposition pour toute question.

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

interface SendError {
  message: string;
  category: "network" | "auth" | "rate_limit" | "server" | "validation" | "unknown";
  hint: string;
  status?: number;
  details?: string;
  attemptedAt: string;
}

const CATEGORY_META: Record<SendError["category"], { label: string; Icon: typeof AlertTriangle }> = {
  network: { label: "Problème réseau", Icon: Wifi },
  auth: { label: "Accès refusé", Icon: ShieldAlert },
  rate_limit: { label: "Limite atteinte", Icon: Clock },
  server: { label: "Erreur serveur", Icon: Server },
  validation: { label: "Données refusées", Icon: AlertTriangle },
  unknown: { label: "Erreur inattendue", Icon: XCircle },
};

interface ErrorBannerProps {
  error: SendError;
  retryCount: number;
  sending: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

const ErrorBanner = ({ error, retryCount, sending, onRetry, onDismiss }: ErrorBannerProps) => {
  const meta = CATEGORY_META[error.category];
  const Icon = meta.Icon;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/10 p-2 text-destructive shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-destructive/40 text-destructive bg-background">
              {meta.label}
            </Badge>
            {typeof error.status === "number" && (
              <Badge variant="outline" className="font-mono text-xs">
                HTTP {error.status}
              </Badge>
            )}
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                Tentative {retryCount + 1}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {format(new Date(error.attemptedAt), "HH:mm:ss", { locale: fr })}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground break-words">{error.message}</p>
          <p className="text-xs text-muted-foreground">{error.hint}</p>
          {error.details && error.details !== error.message && (
            <details className="text-xs text-muted-foreground pt-1">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                Détails techniques
              </summary>
              <pre className="mt-2 p-2 rounded bg-muted/60 border overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                {error.details}
              </pre>
            </details>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={sending}
          className="h-8"
        >
          Ignorer
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onRetry}
          disabled={sending}
          className="h-8 gap-1.5"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
          Réessayer l'envoi
        </Button>
      </div>
    </div>
  );
};

export function AliceApologyEmailButton() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(ALICE_RECIPIENT);
  const [subject, setSubject] = useState(ALICE_SUBJECT);
  const [message, setMessage] = useState(ALICE_DEFAULT_MESSAGE);
  const [history, setHistory] = useState<ApologyLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const MIN_MESSAGE_LENGTH = 20;
  const MAX_SUBJECT_LENGTH = 200;
  const MAX_RECIPIENT_LENGTH = 255;

  const trimmedRecipient = recipient.trim();
  const trimmedSubjectRaw = subject.trim();
  const trimmedSubject = trimmedSubjectRaw || ALICE_SUBJECT;
  const trimmedMessage = message.trim();
  const charCount = trimmedMessage.length;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedRecipient);

  const recipientError = !trimmedRecipient
    ? "L'adresse email du destinataire est requise."
    : !isValidEmail
    ? "Format d'email invalide (ex. nom@domaine.com)."
    : trimmedRecipient.length > MAX_RECIPIENT_LENGTH
    ? `L'adresse ne doit pas dépasser ${MAX_RECIPIENT_LENGTH} caractères.`
    : null;

  const subjectError = !trimmedSubjectRaw
    ? "Le sujet ne peut pas être vide."
    : trimmedSubjectRaw.length > MAX_SUBJECT_LENGTH
    ? `Le sujet ne doit pas dépasser ${MAX_SUBJECT_LENGTH} caractères.`
    : null;

  const messageError = !trimmedMessage
    ? "Le message ne peut pas être vide."
    : trimmedMessage.length < MIN_MESSAGE_LENGTH
    ? `Le message doit contenir au moins ${MIN_MESSAGE_LENGTH} caractères (actuellement ${trimmedMessage.length}).`
    : null;

  const canSend = !recipientError && !subjectError && !messageError;

  const previewHtml = useMemo(
    () =>
      buildBrandedEmailPreview({
        recipientName: ALICE_NAME.split(" ")[0],
        subject: subject || ALICE_SUBJECT,
        message: message || ALICE_DEFAULT_MESSAGE,
        senderName: ALICE_NAME,
      }),
    [subject, message]
  );

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
        metadata: { source: "AliceApologyEmailButton" },
      });
    } catch (err) {
      console.error("Failed to log apology email send", err);
    }
  };

  const classifyError = (err: unknown, data: any): SendError => {
    const now = new Date().toISOString();
    // Supabase FunctionsHttpError carries `context.status`
    const anyErr = err as any;
    const status: number | undefined = anyErr?.context?.status ?? anyErr?.status;
    const rawMessage =
      data?.error ||
      anyErr?.context?.responseJson?.error ||
      anyErr?.message ||
      (err instanceof Error ? err.message : "Erreur inconnue");
    const details = data?.details || anyErr?.context?.responseJson?.details;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        message: "Pas de connexion Internet détectée.",
        category: "network",
        hint: "Vérifiez votre connexion réseau et réessayez.",
        attemptedAt: now,
      };
    }
    if (anyErr?.name === "FunctionsFetchError" || rawMessage?.toLowerCase?.().includes("failed to fetch")) {
      return {
        message: "Impossible de joindre le serveur d'envoi.",
        category: "network",
        hint: "Le service est peut-être momentanément indisponible. Réessayez dans quelques secondes.",
        status,
        details: rawMessage,
        attemptedAt: now,
      };
    }
    if (status === 401 || status === 403) {
      return {
        message: "Vous n'êtes pas autorisé à envoyer cet email.",
        category: "auth",
        hint: "Reconnectez-vous en tant qu'administrateur, puis réessayez.",
        status,
        details: rawMessage,
        attemptedAt: now,
      };
    }
    if (status === 429) {
      return {
        message: "Trop d'envois récents — limite de débit atteinte.",
        category: "rate_limit",
        hint: "Patientez environ une minute avant de réessayer.",
        status,
        details: rawMessage,
        attemptedAt: now,
      };
    }
    if (status === 400 || status === 422) {
      return {
        message: rawMessage || "Données invalides refusées par le serveur.",
        category: "validation",
        hint: "Vérifiez l'adresse, le sujet et le contenu, puis réessayez.",
        status,
        details,
        attemptedAt: now,
      };
    }
    if (status && status >= 500) {
      return {
        message: "Le serveur a rencontré une erreur lors de l'envoi.",
        category: "server",
        hint: "Réessayez dans quelques instants. Si le problème persiste, contactez le support technique.",
        status,
        details: rawMessage,
        attemptedAt: now,
      };
    }
    return {
      message: rawMessage || "Erreur inconnue lors de l'envoi.",
      category: "unknown",
      hint: "Réessayez. Si l'erreur persiste, copiez les détails ci-dessous et contactez le support.",
      status,
      details,
      attemptedAt: now,
    };
  };

  const handleSend = async () => {
    const firstError = recipientError || subjectError || messageError;
    if (firstError) {
      toast.error(firstError);
      setConfirmOpen(false);
      return;
    }
    setSending(true);
    setSendError(null);
    let data: any = null;
    try {
      const res = await supabase.functions.invoke("send-reply", {
        body: {
          to: recipient.trim(),
          subject: subject.trim() || ALICE_SUBJECT,
          message: message.trim(),
          senderName: ALICE_NAME,
        },
      });
      data = res.data;
      if (res.error) throw res.error;
      if (data?.error) throw new Error(data.error);
      if (data?.deduplicated) {
        await logSend("deduplicated");
        toast.info("Email déjà envoyé récemment (anti-doublon).");
      } else {
        await logSend("sent");
        toast.success(`Email d'excuse envoyé à ${recipient}.`);
      }
      setRetryCount(0);
      setOpen(false);
      setConfirmOpen(false);
      fetchHistory();
    } catch (err) {
      const classified = classifyError(err, data);
      setSendError(classified);
      await logSend("failed", `[${classified.category}] ${classified.message}${classified.details ? ` — ${classified.details}` : ""}`);
      toast.error(classified.message);
      setConfirmOpen(false);
      setOpen(true); // garder le dialog ouvert pour permettre la correction
      fetchHistory();
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    handleSend();
  };

  const handleDismissError = () => setSendError(null);

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
          Email de relance — Alice Damervalle (Bretagne Romantique)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Message préparé pour informer Alice de la disponibilité du lien de paiement pour le solde restant (476 €). Vous pouvez relire / modifier puis envoyer en un clic.
        </p>
        <div className="flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Send className="h-4 w-4" />
                Envoyer l'email à Alice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Envoyer l'email à Alice Damervalle</DialogTitle>
                <DialogDescription>
                  Relisez le contenu et l'aperçu brandé avant envoi. Le message sera envoyé via votre adresse contact officielle.
                </DialogDescription>
              </DialogHeader>
              {sendError && (
                <ErrorBanner
                  error={sendError}
                  retryCount={retryCount}
                  sending={sending}
                  onRetry={handleRetry}
                  onDismiss={handleDismissError}
                />
              )}
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
                    <Label htmlFor="alice-recipient">
                      Destinataire <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="alice-recipient"
                      type="email"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      disabled={sending}
                      aria-invalid={!!recipientError}
                      aria-describedby={recipientError ? "alice-recipient-error" : undefined}
                      className={recipientError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {recipientError && (
                      <p id="alice-recipient-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {recipientError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alice-subject">
                      Sujet <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="alice-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={sending}
                      maxLength={MAX_SUBJECT_LENGTH + 50}
                      aria-invalid={!!subjectError}
                      aria-describedby={subjectError ? "alice-subject-error" : undefined}
                      className={subjectError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {subjectError ? (
                      <p id="alice-subject-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {subjectError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground text-right">
                        {trimmedSubjectRaw.length}/{MAX_SUBJECT_LENGTH}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="alice-message">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <span className={`text-xs ${messageError ? "text-destructive" : "text-muted-foreground"}`}>
                        {trimmedMessage.length} caractères (min. {MIN_MESSAGE_LENGTH})
                      </span>
                    </div>
                    <Textarea
                      id="alice-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={14}
                      disabled={sending}
                      aria-invalid={!!messageError}
                      aria-describedby={messageError ? "alice-message-error" : undefined}
                      className={`font-sans text-sm leading-relaxed ${messageError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {messageError && (
                      <p id="alice-message-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {messageError}
                      </p>
                    )}
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
