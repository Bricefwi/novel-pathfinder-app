import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  Compass, 
  Calendar,
  Heart,
  MessageSquare,
  FileText,
  Loader2
} from "lucide-react";

interface DestinationStats {
  name: string;
  count: number;
  percentage: number;
}

interface LevelStats {
  level: string;
  count: number;
  percentage: number;
}

interface TripTypeStats {
  type: string;
  count: number;
  percentage: number;
}

interface DurationStats {
  duration: string;
  count: number;
  percentage: number;
}

interface InterestStats {
  interest: string;
  count: number;
}

interface DevisRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  subject: string | null;
}

export function AdminClientInsights() {
  const [loading, setLoading] = useState(true);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [destinationStats, setDestinationStats] = useState<DestinationStats[]>([]);
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);
  const [tripTypeStats, setTripTypeStats] = useState<TripTypeStats[]>([]);
  const [durationStats, setDurationStats] = useState<DurationStats[]>([]);
  const [interestStats, setInterestStats] = useState<InterestStats[]>([]);
  const [recentDevis, setRecentDevis] = useState<DevisRequest[]>([]);
  const [chatTopics, setChatTopics] = useState<{ topic: string; count: number }[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProfileStats(),
      fetchDevisRequests(),
      fetchChatTopics()
    ]);
    setLoading(false);
  };

  const fetchProfileStats = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("dream_destinations, preferred_trip_types, riding_level, preferred_duration, interests, riding_style");

    if (error || !profiles) return;

    setTotalProfiles(profiles.length);

    // Aggregate destinations
    const destMap = new Map<string, number>();
    profiles.forEach(p => {
      (p.dream_destinations || []).forEach((d: string) => {
        destMap.set(d, (destMap.get(d) || 0) + 1);
      });
    });
    const destStats = Array.from(destMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setDestinationStats(destStats);

    // Aggregate riding levels
    const levelMap = new Map<string, number>();
    const levelLabels: Record<string, string> = {
      debutant: "Débutant",
      intermediaire: "Intermédiaire",
      confirme: "Confirmé",
      expert: "Expert"
    };
    profiles.forEach(p => {
      if (p.riding_level) {
        levelMap.set(p.riding_level, (levelMap.get(p.riding_level) || 0) + 1);
      }
    });
    const lvlStats = Array.from(levelMap.entries())
      .map(([level, count]) => ({
        level: levelLabels[level] || level,
        count,
        percentage: profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
    setLevelStats(lvlStats);

    // Aggregate trip types
    const tripMap = new Map<string, number>();
    profiles.forEach(p => {
      (p.preferred_trip_types || []).forEach((t: string) => {
        tripMap.set(t, (tripMap.get(t) || 0) + 1);
      });
    });
    const ttStats = Array.from(tripMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    setTripTypeStats(ttStats);

    // Aggregate durations
    const durMap = new Map<string, number>();
    profiles.forEach(p => {
      if (p.preferred_duration) {
        durMap.set(p.preferred_duration, (durMap.get(p.preferred_duration) || 0) + 1);
      }
    });
    const durStats = Array.from(durMap.entries())
      .map(([duration, count]) => ({
        duration,
        count,
        percentage: profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
    setDurationStats(durStats);

    // Aggregate interests
    const intMap = new Map<string, number>();
    profiles.forEach(p => {
      (p.interests || []).forEach((i: string) => {
        intMap.set(i, (intMap.get(i) || 0) + 1);
      });
    });
    const intStats = Array.from(intMap.entries())
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    setInterestStats(intStats);
  };

  const fetchDevisRequests = async () => {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, name, email, message, created_at, subject")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setRecentDevis(data);
    }
  };

  const fetchChatTopics = async () => {
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("activity_type, content")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !messages) return;

    // Count by activity_type (chat room)
    const topicMap = new Map<string, number>();
    const topicLabels: Record<string, string> = {
      "randonnee-bretagne": "Randonnée Bretagne",
      "randonnee-maroc": "Randonnée Maroc",
      "hebergement": "Hébergement Yourte",
      "general": "Discussion générale"
    };
    
    messages.forEach(m => {
      const label = topicLabels[m.activity_type] || m.activity_type;
      topicMap.set(label, (topicMap.get(label) || 0) + 1);
    });

    const topics = Array.from(topicMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    
    setChatTopics(topics);
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      "Débutant": "bg-green-100 text-green-800",
      "Intermédiaire": "bg-blue-100 text-blue-800",
      "Confirmé": "bg-purple-100 text-purple-800",
      "Expert": "bg-red-100 text-red-800"
    };
    return colors[level] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Profils analysés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalProfiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Demandes de devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentDevis.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Destinations demandées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{destinationStats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Discussions actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{chatTopics.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="destinations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Destinations
          </TabsTrigger>
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="trips" className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Types de séjours
          </TabsTrigger>
          <TabsTrigger value="interests" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Centres d'intérêt
          </TabsTrigger>
          <TabsTrigger value="devis" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Demandes récentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="destinations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Destinations rêvées par les clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {destinationStats.length === 0 ? (
                <p className="text-muted-foreground">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-4">
                  {destinationStats.map((dest) => (
                    <div key={dest.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{dest.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {dest.count} client{dest.count > 1 ? "s" : ""} ({dest.percentage}%)
                        </span>
                      </div>
                      <Progress value={dest.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Niveaux équestres
                </CardTitle>
              </CardHeader>
              <CardContent>
                {levelStats.length === 0 ? (
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                ) : (
                  <div className="space-y-4">
                    {levelStats.map((stat) => (
                      <div key={stat.level} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={getLevelColor(stat.level)}>{stat.level}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={stat.percentage} className="w-24 h-2" />
                          <span className="text-sm font-medium w-16 text-right">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Durées préférées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {durationStats.length === 0 ? (
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                ) : (
                  <div className="space-y-4">
                    {durationStats.map((stat) => (
                      <div key={stat.duration} className="flex items-center justify-between">
                        <span className="font-medium">{stat.duration}</span>
                        <div className="flex items-center gap-4">
                          <Progress value={stat.percentage} className="w-24 h-2" />
                          <span className="text-sm text-muted-foreground w-16 text-right">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  Types de séjours souhaités
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tripTypeStats.length === 0 ? (
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tripTypeStats.map((stat) => (
                      <Badge key={stat.type} variant="outline" className="text-sm py-1.5 px-3">
                        {stat.type}
                        <span className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                          {stat.count}
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Sujets de discussion populaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chatTopics.length === 0 ? (
                  <p className="text-muted-foreground">Aucune discussion récente</p>
                ) : (
                  <div className="space-y-3">
                    {chatTopics.map((topic) => (
                      <div key={topic.topic} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{topic.topic}</span>
                        <Badge variant="secondary">{topic.count} messages</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Centres d'intérêt des clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interestStats.length === 0 ? (
                <p className="text-muted-foreground">Aucune donnée disponible</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {interestStats.map((stat) => (
                    <Badge 
                      key={stat.interest} 
                      variant="outline" 
                      className="text-sm py-2 px-4 hover:bg-primary/10 transition-colors"
                    >
                      {stat.interest}
                      <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-bold">
                        {stat.count}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Dernières demandes de devis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDevis.length === 0 ? (
                <p className="text-muted-foreground">Aucune demande récente</p>
              ) : (
                <div className="space-y-4">
                  {recentDevis.map((devis) => (
                    <div key={devis.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{devis.name}</p>
                          <p className="text-sm text-muted-foreground">{devis.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(devis.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      {devis.subject && (
                        <Badge variant="outline">{devis.subject}</Badge>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {devis.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
