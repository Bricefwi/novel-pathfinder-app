import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, Receipt, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: string;
  date: string;
  event_type: "quote" | "booking" | "invoice";
  status: string;
  title: string;
  amount: number | null;
}

const EVENT_CONFIG = {
  quote: {
    icon: FileText,
    label: "Devis",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
  },
  booking: {
    icon: Calendar,
    label: "Réservation",
    color: "bg-green-100 text-green-700 border-green-200",
    iconColor: "text-green-600",
  },
  invoice: {
    icon: Receipt,
    label: "Facture",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
  },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  // Quote statuses
  draft: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Brouillon" },
  sent: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "Envoyé" },
  validated: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Validé" },
  accepted: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Accepté" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Refusé" },
  expired: { icon: XCircle, color: "bg-muted text-muted-foreground", label: "Expiré" },
  
  // Booking statuses
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "En attente" },
  confirmed: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Confirmé" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Annulé" },
  completed: { icon: CheckCircle, color: "bg-primary/10 text-primary", label: "Terminé" },
  
  // Payment statuses
  paid: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Payé" },
  partial: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Partiel" },
  overdue: { icon: XCircle, color: "bg-red-100 text-red-700", label: "En retard" },
};

export function ClientTimeline() {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["client-timeline"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Récupérer les devis
      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, created_at, status, activity_title, total_price")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Récupérer les réservations
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, created_at, status, activity_id, total_price")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Récupérer les factures
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, created_at, payment_status, activity_title, total_amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Combiner et trier
      const timeline: TimelineEvent[] = [
        ...(quotes || []).map(q => ({
          id: q.id,
          date: q.created_at,
          event_type: "quote" as const,
          status: q.status || "draft",
          title: q.activity_title,
          amount: q.total_price,
        })),
        ...(bookings || []).map(b => ({
          id: b.id,
          date: b.created_at,
          event_type: "booking" as const,
          status: b.status || "pending",
          title: "Réservation",
          amount: b.total_price,
        })),
        ...(invoices || []).map(i => ({
          id: i.id,
          date: i.created_at,
          event_type: "invoice" as const,
          status: i.payment_status || "pending",
          title: i.activity_title,
          amount: i.total_amount,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return timeline;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erreur lors du chargement de l'historique
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun événement dans votre historique</p>
          <p className="text-sm mt-2">Vos devis, réservations et factures apparaîtront ici</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique de vos activités
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Ligne verticale */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {events.map((event) => {
              const config = EVENT_CONFIG[event.event_type];
              const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
              const Icon = config.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={`${event.event_type}-${event.id}`} className="relative pl-10">
                  {/* Point sur la timeline */}
                  <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 border-background ${config.color} flex items-center justify-center`}>
                    <Icon className={`h-3 w-3 ${config.iconColor}`} />
                  </div>

                  <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {event.amount && (
                        <div className="text-right">
                          <p className="font-semibold text-lg">{event.amount.toFixed(2)} €</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientTimeline;
