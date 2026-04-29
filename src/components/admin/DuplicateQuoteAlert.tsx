import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Link2, Archive, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExistingQuote {
  id: string;
  quote_number: string;
  activity_title: string;
  total_price: number;
  status: string;
  created_at: string;
  start_date: string | null;
  notes: string | null;
}

interface DuplicateQuoteAlertProps {
  clientEmail: string;
  activityTitle: string;
  onLinked?: () => void;
}

/**
 * Détecte les devis actifs récents (≤ 60 jours) pour le même client + activité
 * et propose de les lier (note croisée) ou de les archiver (annulation).
 */
export const DuplicateQuoteAlert = ({
  clientEmail,
  activityTitle,
  onLinked,
}: DuplicateQuoteAlertProps) => {
  const [existing, setExisting] = useState<ExistingQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const email = clientEmail.trim().toLowerCase();
    const title = activityTitle.trim();
    if (!email || email.length < 5 || !title) {
      setExisting([]);
      return;
    }

    let cancelled = false;
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_number, activity_title, total_price, status, created_at, start_date, notes")
          .ilike("client_email", email)
          .gte("created_at", sixtyDaysAgo)
          .not("status", "in", "(cancelled,paid,refunded)")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        if (cancelled) return;

        const titleLower = title.toLowerCase();
        const matches = (data || []).filter(
          (q) =>
            q.activity_title?.toLowerCase().includes(titleLower) ||
            titleLower.includes(q.activity_title?.toLowerCase() || "__none__")
        );
        setExisting(matches);
      } catch (err) {
        console.warn("[DuplicateQuoteAlert] check failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [clientEmail, activityTitle]);

  const handleLink = async (quote: ExistingQuote) => {
    setActionLoading(quote.id);
    try {
      const note = `\n[${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}] Doublon détecté : un nouveau devis va être créé pour la même cliente sur la même activité. Devis précédent conservé pour suivi.`;
      const { error } = await supabase
        .from("quotes")
        .update({ notes: (quote.notes || "") + note })
        .eq("id", quote.id);
      if (error) throw error;
      toast.success(`Note ajoutée au devis ${quote.quote_number}`);
      setDismissedIds((prev) => [...prev, quote.id]);
      onLinked?.();
    } catch (err) {
      toast.error("Impossible d'ajouter la note de liaison.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (quote: ExistingQuote) => {
    if (
      !window.confirm(
        `Archiver (annuler) le devis ${quote.quote_number} ?\n\nIl passera en statut "annulé", ses relances seront stoppées et un email d'excuse sera envoyé à la cliente.`
      )
    )
      return;

    setActionLoading(quote.id);
    try {
      const { error } = await supabase.functions.invoke("cancel-quote", {
        body: {
          quote_id: quote.id,
          reason: "Doublon détecté lors de la création d'un nouveau devis pour la même cliente.",
        },
      });
      if (error) throw error;
      toast.success(`Devis ${quote.quote_number} archivé et email envoyé`);
      setDismissedIds((prev) => [...prev, quote.id]);
      onLinked?.();
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'archiver le devis.");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const visible = existing.filter((q) => !dismissedIds.includes(q.id));

  if (loading && visible.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Vérification des devis existants…
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 !text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {visible.length === 1 ? "Devis existant détecté" : `${visible.length} devis existants détectés`}
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-xs">
          Cette cliente a déjà un devis actif pour une activité similaire. Choisissez une action pour éviter le doublon avant de créer le nouveau devis.
        </p>
        <div className="space-y-2">
          {visible.map((q) => {
            const isLoading = actionLoading === q.id;
            return (
              <div
                key={q.id}
                className="flex flex-col gap-2 rounded-md border border-amber-300/60 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-xs text-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">{q.quote_number}</span>
                    <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                    <span className="text-muted-foreground">
                      {format(new Date(q.created_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {q.activity_title} · {q.total_price}€
                    {q.start_date && ` · départ ${format(new Date(q.start_date), "dd/MM/yyyy", { locale: fr })}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => window.open(`/admin?module=quotes&quote=${q.id}`, "_blank")}
                    disabled={isLoading}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Voir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleLink(q)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                    Lier
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={() => handleArchive(q)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Archive className="h-3 w-3 mr-1" />}
                    Archiver
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </AlertDescription>
    </Alert>
  );
};
