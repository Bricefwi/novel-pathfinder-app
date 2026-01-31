import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Calendar, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Mail,
  Send,
  User
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: string;
  date: string;
  event_type: "quote" | "booking" | "invoice" | "email";
  status: string;
  title: string;
  amount: number | null;
  details?: string;
}

interface AdminClientTimelineProps {
  userId?: string;
  clientEmail?: string;
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
  email: {
    icon: Mail,
    label: "Email",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
  },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  // Quote statuses
  draft: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Brouillon" },
  sent: { icon: Send, color: "bg-blue-100 text-blue-700", label: "Envoyé" },
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

  // Email statuses
  success: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Envoyé" },
  failed: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Échec" },
};

export function AdminClientTimeline({ userId, clientEmail }: AdminClientTimelineProps) {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["admin-client-timeline", userId, clientEmail],
    enabled: !!(userId || clientEmail),
    queryFn: async () => {
      const timeline: TimelineEvent[] = [];

      // 1. Fetch quotes
      let quotesQuery = supabase
        .from("quotes")
        .select("id, created_at, status, activity_title, total_price, client_email, quote_number")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (userId) {
        quotesQuery = quotesQuery.eq("user_id", userId);
      } else if (clientEmail) {
        quotesQuery = quotesQuery.eq("client_email", clientEmail);
      }

      const { data: quotes } = await quotesQuery;

      if (quotes) {
        quotes.forEach(q => {
          timeline.push({
            id: q.id,
            date: q.created_at,
            event_type: "quote",
            status: q.status || "draft",
            title: q.activity_title || "Devis",
            amount: q.total_price,
            details: q.quote_number,
          });
        });
      }

      // 2. Fetch bookings
      let bookingsQuery = supabase
        .from("bookings")
        .select("id, created_at, status, total_price, contact_name, contact_email")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (userId) {
        bookingsQuery = bookingsQuery.eq("user_id", userId);
      } else if (clientEmail) {
        bookingsQuery = bookingsQuery.eq("contact_email", clientEmail);
      }

      const { data: bookings } = await bookingsQuery;

      if (bookings) {
        bookings.forEach(b => {
          timeline.push({
            id: b.id,
            date: b.created_at,
            event_type: "booking",
            status: b.status || "pending",
            title: "Réservation",
            amount: b.total_price,
          });
        });
      }

      // 3. Fetch invoices
      let invoicesQuery = supabase
        .from("invoices")
        .select("id, created_at, payment_status, activity_title, total_amount, invoice_number, client_email")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (userId) {
        invoicesQuery = invoicesQuery.eq("user_id", userId);
      } else if (clientEmail) {
        invoicesQuery = invoicesQuery.eq("client_email", clientEmail);
      }

      const { data: invoices } = await invoicesQuery;

      if (invoices) {
        invoices.forEach(i => {
          timeline.push({
            id: i.id,
            date: i.created_at,
            event_type: "invoice",
            status: i.payment_status || "pending",
            title: i.activity_title || "Facture",
            amount: i.total_amount,
            details: i.invoice_number,
          });
        });
      }

      // 4. Fetch email audit logs
      let emailQuery = supabase
        .from("email_audit_log")
        .select("id, created_at, status, subject, type, recipient")
        .order("created_at", { ascending: false })
        .limit(30);

      if (userId) {
        emailQuery = emailQuery.eq("user_id", userId);
      } else if (clientEmail) {
        emailQuery = emailQuery.eq("recipient", clientEmail);
      }

      const { data: emailLogs } = await emailQuery;

      if (emailLogs) {
        emailLogs.forEach(e => {
          timeline.push({
            id: e.id,
            date: e.created_at || new Date().toISOString(),
            event_type: "email",
            status: e.status || "success",
            title: e.subject || `Email: ${e.type}`,
            amount: null,
            details: e.type,
          });
        });
      }

      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return timeline;
    },
  });

  if (!userId && !clientEmail) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Sélectionnez un client pour voir son historique</p>
        </CardContent>
      </Card>
    );
  }

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
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique client
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun historique récent pour ce client</p>
          <p className="text-sm mt-2">Les devis, réservations et factures apparaîtront ici</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique client ({events.length} événements)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Ligne verticale */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
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

                  <div className="bg-card border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={`${config.color} text-xs`}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {event.details && (
                            <span className="text-xs text-muted-foreground">
                              {event.details}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {event.amount && (
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{event.amount.toFixed(2)} €</p>
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

export default AdminClientTimeline;
