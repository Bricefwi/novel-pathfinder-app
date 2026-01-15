import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatCommunautaire from "@/components/chat/ChatCommunautaire";
import { UserDocuments } from "@/components/user/UserDocuments";
import { 
  User, 
  Heart, 
  Calendar, 
  MapPin, 
  Star, 
  Settings, 
  Bell, 
  CreditCard,
  Award,
  Mountain,
  Compass,
  ArrowRight,
  CalendarDays,
  MessageCircle,
  Sparkles,
  TrendingUp,
  FileText,
  Users
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  riding_level: string | null;
  bio: string | null;
  riding_experience_years: number | null;
  riding_style: string[] | null;
  dream_destinations: string[] | null;
  preferred_trip_types: string[] | null;
  preferred_duration: string | null;
  travel_style: string | null;
  interests: string[] | null;
  onboarding_completed: boolean | null;
}

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
  };
}

interface Subscription {
  id: string;
  status: string;
  subscribed_at: string;
  activity?: {
    title: string;
    location: string;
    activity_type: string;
  };
}

interface Activity {
  id: string;
  title: string;
  location: string;
  activity_type: string;
  short_description: string | null;
  featured_image: string | null;
  price_from: number | null;
}

const MonEspace = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchUserData(session.user.id);
  };

  const fetchUserData = async (userId: string) => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileData) setProfile(profileData);

    // Fetch bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(`
        *,
        activity:activities(title, location, activity_type)
      `)
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (bookingsData) setBookings(bookingsData as Booking[]);

    // Fetch subscriptions
    const { data: subsData } = await supabase
      .from("activity_subscriptions")
      .select(`
        *,
        activity:activities(title, location, activity_type)
      `)
      .eq("user_id", userId)
      .order("subscribed_at", { ascending: false });

    if (subsData) setSubscriptions(subsData as Subscription[]);

    // Fetch recommended activities
    const { data: activitiesData } = await supabase
      .from("activities")
      .select("id, title, location, activity_type, short_description, featured_image, price_from")
      .eq("is_active", true)
      .limit(4);

    if (activitiesData) setRecommendedActivities(activitiesData);

    setLoading(false);
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      randonnee: "Randonnée",
      cours: "Cours",
      stage: "Stage",
      sejour: "Séjour",
      hebergement: "Hébergement",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      confirmed: "bg-green-500/20 text-green-700 border-green-500/30",
      cancelled: "bg-destructive/20 text-destructive border-destructive/30",
      completed: "bg-primary/20 text-primary border-primary/30",
      active: "bg-green-500/20 text-green-700 border-green-500/30",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmée",
      cancelled: "Annulée",
      completed: "Terminée",
      active: "Actif",
    };
    return labels[status] || status;
  };

  const getRidingLevelLabel = (level: string | null) => {
    const labels: Record<string, string> = {
      debutant: "Débutant",
      intermediaire: "Intermédiaire",
      confirme: "Confirmé",
      expert: "Expert",
    };
    return level ? labels[level] || level : "Non renseigné";
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.first_name,
      profile.last_name,
      profile.phone,
      profile.riding_level,
      profile.riding_experience_years,
      profile.dream_destinations?.length,
      profile.preferred_trip_types?.length,
      profile.interests?.length,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  if (loading) {
    return (
      <Layout>
        <section className="pt-32 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-8">
              <div className="h-12 bg-muted rounded w-1/3" />
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-muted rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-32 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                Bonjour, <span className="text-primary">{profile?.first_name || "Aventurier"}</span> !
              </h1>
              <p className="text-muted-foreground">
                Bienvenue dans votre espace personnel
              </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Profile Completion Card */}
          {!profile?.onboarding_completed && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Complétez votre profil</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Renseignez vos préférences pour recevoir des recommandations personnalisées
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress value={calculateProfileCompletion()} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{calculateProfileCompletion()}%</span>
                    </div>
                  </div>
                  <Button onClick={() => navigate("/onboarding")}>
                    Compléter mon profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link to="/planning">
              <Card className="border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <CalendarDays className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Planning</h3>
                  <p className="text-xs text-muted-foreground">Voir les disponibilités</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/sejours">
              <Card className="border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <Compass className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Séjours</h3>
                  <p className="text-xs text-muted-foreground">Découvrir les aventures</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/destinations">
              <Card className="border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">Destinations</h3>
                  <p className="text-xs text-muted-foreground">Explorer le monde</p>
                </CardContent>
              </Card>
            </Link>
            <Card 
              className="border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                const chatTab = document.querySelector('[value="chat"]') as HTMLElement;
                if (chatTab) chatTab.click();
              }}
            >
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Chat</h3>
                <p className="text-xs text-muted-foreground">Communauté</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                    <p className="text-xs text-muted-foreground">Réservations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{subscriptions.length}</p>
                    <p className="text-xs text-muted-foreground">Abonnements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getRidingLevelLabel(profile?.riding_level)}</p>
                    <p className="text-xs text-muted-foreground">Niveau</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mountain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile?.riding_experience_years || 0}</p>
                    <p className="text-xs text-muted-foreground">Années d'exp.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="reservations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Réservations</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="abonnements" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Abonnements</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Préférences</span>
              </TabsTrigger>
              <TabsTrigger value="decouvrir" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Pour vous</span>
              </TabsTrigger>
              <TabsTrigger value="profil" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
            </TabsList>

            {/* Reservations Tab */}
            <TabsContent value="reservations">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Mes Réservations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Aucune réservation</h3>
                      <p className="text-muted-foreground mb-4">
                        Découvrez nos séjours et réservez votre prochaine aventure
                      </p>
                      <Button onClick={() => navigate("/sejours")}>
                        Voir les séjours
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-primary">
                              {new Date(booking.start_date).getDate()}
                            </span>
                            <span className="text-xs text-muted-foreground uppercase">
                              {new Date(booking.start_date).toLocaleDateString("fr-FR", { month: "short" })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">
                              {booking.activity?.title || "Réservation"}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {booking.activity?.location || "Bretagne"}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {booking.participants} pers.
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusLabel(booking.status)}
                            </Badge>
                            {booking.total_price && (
                              <p className="text-sm font-semibold mt-1">{booking.total_price}€</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              {user && <UserDocuments userId={user.id} />}
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="abonnements">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Mes Abonnements aux Activités
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {subscriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Aucun abonnement</h3>
                      <p className="text-muted-foreground mb-4">
                        Abonnez-vous à des activités pour être notifié des nouveautés
                      </p>
                      <Button onClick={() => navigate("/destinations")}>
                        Découvrir les activités
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
                        >
                          <div>
                            <h4 className="font-semibold">{sub.activity?.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {sub.activity?.location}
                            </p>
                          </div>
                          <Badge className={getStatusColor(sub.status)}>
                            {getStatusLabel(sub.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat">
              <ChatCommunautaire />
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      Destinations Rêvées
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile?.dream_destinations?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.dream_destinations.map((dest) => (
                          <Badge key={dest} variant="outline" className="text-sm">
                            {dest}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune destination renseignée</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Types de Séjours Préférés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile?.preferred_trip_types?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.preferred_trip_types.map((type) => (
                          <Badge key={type} variant="outline" className="text-sm">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune préférence renseignée</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Mountain className="h-5 w-5 text-primary" />
                      Style d'Équitation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile?.riding_style?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.riding_style.map((style) => (
                          <Badge key={style} variant="outline" className="text-sm">
                            {style}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucun style renseigné</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Centres d'Intérêt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile?.interests?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest) => (
                          <Badge key={interest} variant="outline" className="text-sm">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucun intérêt renseigné</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 text-center">
                <Button onClick={() => navigate("/onboarding")}>
                  Modifier mes préférences
                </Button>
              </div>
            </TabsContent>

            {/* Discover Tab - Recommended Activities */}
            <TabsContent value="decouvrir">
              <div className="space-y-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Activités Recommandées
                    </CardTitle>
                    <CardDescription>
                      Basées sur vos préférences et centres d'intérêt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recommendedActivities.length === 0 ? (
                      <div className="text-center py-12">
                        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Aucune activité disponible</h3>
                        <p className="text-muted-foreground">
                          De nouvelles aventures arrivent bientôt
                        </p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {recommendedActivities.map((activity) => (
                          <Link key={activity.id} to={`/destinations`}>
                            <div className="group rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all">
                              <div className="aspect-[16/9] overflow-hidden bg-muted">
                                {activity.featured_image ? (
                                  <img 
                                    src={activity.featured_image} 
                                    alt={activity.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Mountain className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getActivityTypeLabel(activity.activity_type)}
                                  </Badge>
                                </div>
                                <h4 className="font-semibold group-hover:text-primary transition-colors">
                                  {activity.title}
                                </h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {activity.location}
                                </p>
                                {activity.price_from && (
                                  <p className="text-sm font-semibold text-primary mt-2">
                                    À partir de {activity.price_from}€
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="mt-6 text-center">
                      <Link to="/destinations">
                        <Button variant="outline" className="group">
                          Voir toutes les activités
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Trending Section */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Tendances du moment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {["Randonnée Maroc", "Stage Bretagne", "Séjour Yourte", "Balade plage"].map((trend) => (
                        <Badge 
                          key={trend} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => navigate("/destinations")}
                        >
                          {trend}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profil">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Mon Profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Prénom</label>
                        <p className="font-medium">{profile?.first_name || "Non renseigné"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Nom</label>
                        <p className="font-medium">{profile?.last_name || "Non renseigné"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Email</label>
                        <p className="font-medium">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Téléphone</label>
                        <p className="font-medium">{profile?.phone || "Non renseigné"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Niveau équestre</label>
                        <p className="font-medium">{getRidingLevelLabel(profile?.riding_level)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Années d'expérience</label>
                        <p className="font-medium">{profile?.riding_experience_years || 0} ans</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Style de voyage</label>
                        <p className="font-medium">{profile?.travel_style || "Non renseigné"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Durée préférée</label>
                        <p className="font-medium">{profile?.preferred_duration || "Non renseigné"}</p>
                      </div>
                    </div>
                  </div>
                  {profile?.bio && (
                    <div className="mt-6">
                      <label className="text-sm text-muted-foreground">Bio</label>
                      <p className="font-medium">{profile.bio}</p>
                    </div>
                  )}
                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={() => navigate("/onboarding")}>
                      Modifier le profil
                    </Button>
                    <Button variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Moyens de paiement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default MonEspace;
