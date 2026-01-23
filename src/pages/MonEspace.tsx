import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ChatCommunautaire from "@/components/chat/ChatCommunautaire";
import { TravelHubOverview } from "@/components/user/TravelHubOverview";
import { TravelHubTrips } from "@/components/user/TravelHubTrips";
import { TravelHubDocuments } from "@/components/user/TravelHubDocuments";
import { TravelHubProfile } from "@/components/user/TravelHubProfile";
import { FloatingHelpButton } from "@/components/user/FloatingHelpButton";
import { useQuoteRealtime } from "@/hooks/use-quote-realtime";
import { 
  Home, 
  Plane, 
  FileText, 
  User,
  Bell, 
  Settings
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
    featured_image?: string;
  };
}

interface Quote {
  id: string;
  status: string;
  total_price: number;
  activity_title: string;
  created_at: string;
}

const MonEspace = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accueil");

  // Realtime hook for quotes
  useQuoteRealtime({
    userEmail: user?.email || '',
    onQuoteUpdate: (updatedQuote) => {
      setQuotes(prev => prev.map(q => 
        q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q
      ));
    },
  });

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
    await fetchUserData(session.user.id, session.user.email || '');
  };

  const fetchUserData = async (userId: string, email: string) => {
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
        activity:activities(title, location, activity_type, featured_image)
      `)
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (bookingsData) setBookings(bookingsData as Booking[]);

    // Fetch quotes - using total_price (correct column name)
    const { data: quotesData } = await supabase
      .from("quotes")
      .select("id, status, total_price, activity_title, created_at")
      .eq("client_email", email)
      .order("created_at", { ascending: false });

    if (quotesData) setQuotes(quotesData);

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <section className="pt-32 pb-16 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="space-y-6">
              <Skeleton className="h-12 w-1/3 rounded-lg" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
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
      <section className="pt-28 pb-16 min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-1">
                Bonjour, <span className="text-primary">{profile?.first_name || "Aventurier"}</span> !
              </h1>
              <p className="text-muted-foreground">
                Bienvenue dans votre espace voyage
              </p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setActiveTab("documents")}
                title="Notifications et documents"
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setActiveTab("profil")}
                title="Paramètres du profil"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1">
              <TabsTrigger value="accueil" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3">
                <Home className="h-4 w-4" />
                <span className="text-xs md:text-sm">Accueil</span>
              </TabsTrigger>
              <TabsTrigger value="voyages" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3">
                <Plane className="h-4 w-4" />
                <span className="text-xs md:text-sm">Voyages</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3">
                <FileText className="h-4 w-4" />
                <span className="text-xs md:text-sm">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="profil" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3">
                <User className="h-4 w-4" />
                <span className="text-xs md:text-sm">Profil</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="accueil">
              <TravelHubOverview 
                profile={profile}
                bookings={bookings}
                quotes={quotes}
                loading={loading}
                onTabChange={setActiveTab}
              />
            </TabsContent>

            {/* Trips Tab */}
            <TabsContent value="voyages">
              <TravelHubTrips 
                bookings={bookings}
                loading={loading}
              />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              {user && <TravelHubDocuments userId={user.id} />}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profil">
              <TravelHubProfile 
                profile={profile}
                userEmail={user?.email || ''}
                loading={loading}
              />
            </TabsContent>

            {/* Chat Tab (hidden from nav but accessible) */}
            <TabsContent value="chat">
              <ChatCommunautaire />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Floating Help Button (Mobile) */}
      <FloatingHelpButton onChatOpen={() => setActiveTab("chat")} />
    </Layout>
  );
};

export default MonEspace;
