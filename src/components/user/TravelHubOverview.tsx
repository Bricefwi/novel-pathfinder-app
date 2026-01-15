import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  MapPin, 
  MessageCircle, 
  Compass, 
  FileText, 
  Clock,
  ChevronRight,
  Plane,
  Sparkles
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
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

interface Quote {
  id: string;
  status: string;
  total_amount: number;
  activity_title: string;
  created_at: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean | null;
}

interface TravelHubOverviewProps {
  profile: Profile | null;
  bookings: Booking[];
  quotes: Quote[];
  loading: boolean;
  onTabChange: (tab: string) => void;
}

export const TravelHubOverview = ({ 
  profile, 
  bookings, 
  quotes, 
  loading,
  onTabChange 
}: TravelHubOverviewProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  
  // Find next confirmed trip
  const nextTrip = bookings.find(b => 
    b.status === 'confirmed' && new Date(b.start_date) > new Date()
  );
  
  // Pending quotes
  const pendingQuotes = quotes.filter(q => q.status === 'pending' || q.status === 'sent');
  
  // Determine user state
  const userState = nextTrip 
    ? (differenceInDays(new Date(nextTrip.start_date), new Date()) <= 0 ? 'en-voyage' : 'avant-depart')
    : pendingQuotes.length > 0 
      ? 'prospect-devis' 
      : 'prospect';

  // Countdown effect
  useEffect(() => {
    if (!nextTrip) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const tripDate = new Date(nextTrip.start_date);
      const diffMs = tripDate.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setCountdown({ days, hours, minutes });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextTrip]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card - Contextual */}
      {userState === 'avant-depart' && nextTrip && countdown && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative h-64 md:h-72">
            {/* Background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: nextTrip.activity?.featured_image 
                  ? `url(${nextTrip.activity.featured_image})` 
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-6">
              <Badge className="w-fit mb-3 bg-primary/90 text-primary-foreground">
                <Plane className="h-3 w-3 mr-1" />
                Prochain départ
              </Badge>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                {nextTrip.activity?.title || "Votre voyage"}
              </h2>
              <p className="text-muted-foreground flex items-center gap-1 mb-4">
                <MapPin className="h-4 w-4" />
                {nextTrip.activity?.location} • {format(new Date(nextTrip.start_date), 'dd MMMM yyyy', { locale: fr })}
              </p>
              
              {/* Countdown */}
              <div className="flex gap-4">
                <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[70px]">
                  <span className="text-2xl md:text-3xl font-bold text-primary">{countdown.days}</span>
                  <p className="text-xs text-muted-foreground">jours</p>
                </div>
                <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[70px]">
                  <span className="text-2xl md:text-3xl font-bold text-primary">{countdown.hours}</span>
                  <p className="text-xs text-muted-foreground">heures</p>
                </div>
                <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[70px]">
                  <span className="text-2xl md:text-3xl font-bold text-primary">{countdown.minutes}</span>
                  <p className="text-xs text-muted-foreground">min</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {userState === 'en-voyage' && nextTrip && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-green-500/20 text-green-700 border-green-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  En voyage actuellement
                </Badge>
                <h2 className="text-xl font-serif font-bold">{nextTrip.activity?.title}</h2>
                <p className="text-muted-foreground text-sm">{nextTrip.activity?.location}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => onTabChange("voyages")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Mon Itinéraire
                </Button>
                <Button variant="outline" onClick={() => onTabChange("chat")}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Assistance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {userState === 'prospect-devis' && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold mb-1">
                  Vous avez {pendingQuotes.length} devis en attente
                </h2>
                <p className="text-muted-foreground text-sm">
                  Consultez vos propositions et finalisez votre réservation
                </p>
              </div>
              <Button onClick={() => onTabChange("documents")}>
                <FileText className="h-4 w-4 mr-2" />
                Voir mes devis
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {userState === 'prospect' && (
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-2">
              Votre prochaine aventure vous attend
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Explorez nos destinations et laissez-vous guider vers une expérience équestre unique
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/destinations")} size="lg">
                <MapPin className="h-4 w-4 mr-2" />
                Découvrir les destinations
              </Button>
              <Button variant="outline" onClick={() => navigate("/demande-devis")} size="lg">
                Demander un devis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          icon={Calendar}
          title="Planning"
          description="Disponibilités"
          onClick={() => navigate("/planning")}
        />
        <QuickActionCard
          icon={MapPin}
          title="Destinations"
          description="Explorer"
          onClick={() => navigate("/destinations")}
        />
        <QuickActionCard
          icon={FileText}
          title="Documents"
          description="Devis & Factures"
          onClick={() => onTabChange("documents")}
        />
        <QuickActionCard
          icon={MessageCircle}
          title="Chat"
          description="Communauté"
          onClick={() => onTabChange("chat")}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Mes Voyages
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onTabChange("voyages")}>
                Voir tout
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <EmptyState 
                icon={Compass}
                title="Aucun voyage"
                description="Réservez votre première aventure"
                actionLabel="Découvrir"
                onAction={() => navigate("/destinations")}
              />
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 2).map(booking => (
                  <div 
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onTabChange("voyages")}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {new Date(booking.start_date).getDate()}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {format(new Date(booking.start_date), 'MMM', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {booking.activity?.title || "Réservation"}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {booking.activity?.location}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        booking.status === 'confirmed' 
                          ? 'bg-green-500/10 text-green-700 border-green-500/30' 
                          : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
                      }
                    >
                      {booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Quotes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Devis en attente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onTabChange("documents")}>
                Voir tout
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingQuotes.length === 0 ? (
              <EmptyState 
                icon={FileText}
                title="Aucun devis"
                description="Demandez un devis personnalisé"
                actionLabel="Demander"
                onAction={() => navigate("/demande-devis")}
              />
            ) : (
              <div className="space-y-3">
                {pendingQuotes.slice(0, 2).map(quote => (
                  <div 
                    key={quote.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onTabChange("documents")}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{quote.activity_title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <span className="font-semibold text-primary">{quote.total_amount}€</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Quick Action Card Component
interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

const QuickActionCard = ({ icon: Icon, title, description, onClick }: QuickActionCardProps) => (
  <Card 
    className="border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
    onClick={onClick}
  >
    <CardContent className="p-4 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// Empty State Component
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="text-center py-6">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h4 className="font-medium text-sm mb-1">{title}</h4>
    <p className="text-xs text-muted-foreground mb-3">{description}</p>
    <Button variant="outline" size="sm" onClick={onAction}>
      {actionLabel}
    </Button>
  </div>
);

export default TravelHubOverview;
