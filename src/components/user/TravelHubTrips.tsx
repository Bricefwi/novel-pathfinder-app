import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  ChevronRight,
  Compass,
  CheckCircle2,
  Circle,
  AlertCircle
} from "lucide-react";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  total_price: number | null;
  participants: number;
  activity?: {
    title: string;
    location: string;
    activity_type: string;
    featured_image?: string;
  };
}

interface TravelHubTripsProps {
  bookings: Booking[];
  loading: boolean;
}

export const TravelHubTrips = ({ bookings, loading }: TravelHubTripsProps) => {
  const navigate = useNavigate();
  const now = new Date();

  // Separate trips
  const upcomingTrips = bookings.filter(b => 
    isAfter(new Date(b.start_date), now) && b.status !== 'cancelled'
  );
  const pastTrips = bookings.filter(b => 
    isBefore(new Date(b.start_date), now) || b.status === 'completed'
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Confirmé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Annulé</Badge>;
      case 'completed':
        return <Badge className="bg-primary/10 text-primary border-primary/30">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            À venir ({upcomingTrips.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Passés ({pastTrips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingTrips.length === 0 ? (
            <EmptyTripsState onAction={() => navigate("/destinations")} />
          ) : (
            upcomingTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} isUpcoming />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastTrips.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Aucun voyage passé</h3>
                <p className="text-muted-foreground text-sm">
                  Vos voyages terminés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            pastTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} isUpcoming={false} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Trip Card Component
interface TripCardProps {
  trip: {
    id: string;
    start_date: string;
    end_date: string | null;
    status: string;
    total_price: number | null;
    participants: number;
    activity?: {
      title: string;
      location: string;
      activity_type: string;
      featured_image?: string;
    };
  };
  isUpcoming: boolean;
}

const TripCard = ({ trip, isUpcoming }: TripCardProps) => {
  const daysUntil = differenceInDays(new Date(trip.start_date), new Date());
  
  // Timeline milestones for upcoming trips
  const timelineMilestones = [
    { 
      label: "Réservation confirmée", 
      done: trip.status === 'confirmed',
      date: null 
    },
    { 
      label: "Solde à payer", 
      done: daysUntil <= 30,
      date: daysUntil > 30 ? `J-30` : null
    },
    { 
      label: "Carnet de voyage disponible", 
      done: daysUntil <= 7,
      date: daysUntil > 7 ? `J-7` : null
    },
    { 
      label: "Départ", 
      done: daysUntil <= 0,
      date: format(new Date(trip.start_date), 'dd MMM', { locale: fr })
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Confirmé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Annulé</Badge>;
      case 'completed':
        return <Badge className="bg-primary/10 text-primary border-primary/30">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
          {trip.activity?.featured_image ? (
            <img 
              src={trip.activity.featured_image}
              alt={trip.activity.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Compass className="h-12 w-12 text-primary/50" />
            </div>
          )}
          {isUpcoming && daysUntil > 0 && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-background/90 text-foreground shadow-sm">
                J-{daysUntil}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-serif text-lg font-bold mb-1">
                {trip.activity?.title || "Voyage"}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.activity?.location}
              </p>
            </div>
            {getStatusBadge(trip.status)}
          </div>

          {/* Trip Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(trip.start_date), 'dd MMM yyyy', { locale: fr })}
              {trip.end_date && ` - ${format(new Date(trip.end_date), 'dd MMM yyyy', { locale: fr })}`}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {trip.participants} participant{trip.participants > 1 ? 's' : ''}
            </span>
            {trip.total_price && (
              <span className="font-semibold text-primary">
                {trip.total_price}€
              </span>
            )}
          </div>

          {/* Timeline for upcoming trips */}
          {isUpcoming && trip.status === 'confirmed' && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {timelineMilestones.map((milestone, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        milestone.done 
                          ? 'bg-green-500/20 text-green-600' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {milestone.done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <span className="text-[10px] text-center mt-1 text-muted-foreground">
                        {milestone.label}
                      </span>
                      {milestone.date && (
                        <span className="text-[9px] text-primary font-medium">
                          {milestone.date}
                        </span>
                      )}
                    </div>
                    {index < timelineMilestones.length - 1 && (
                      <div className={`w-8 h-0.5 ${
                        milestone.done ? 'bg-green-500/30' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Empty State
const EmptyTripsState = ({ onAction }: { onAction: () => void }) => (
  <Card className="border-border/50 overflow-hidden">
    <CardContent className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        <Compass className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-serif text-xl font-bold mb-2">Aucun voyage prévu</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Explorez nos destinations et réservez votre prochaine aventure équestre
      </p>
      <Button onClick={onAction} size="lg">
        <MapPin className="h-4 w-4 mr-2" />
        Découvrir les destinations
      </Button>
    </CardContent>
  </Card>
);

export default TravelHubTrips;
