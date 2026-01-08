import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LayoutDashboard, MapPin, FileText, Image, MessageSquare, Home, CreditCard, Star } from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminActivities } from "@/components/admin/AdminActivities";
import { AdminArticles } from "@/components/admin/AdminArticles";
import { AdminGallery } from "@/components/admin/AdminGallery";
import { AdminChat } from "@/components/admin/AdminChat";
import { AdminAccommodation } from "@/components/admin/AdminAccommodation";
import { AdminReviews } from "@/components/admin/AdminReviews";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Administration
            </h1>
            <p className="text-muted-foreground mt-2">
              Gérez votre contenu, vos réservations et votre communauté
            </p>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Tableau de bord</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Activités</span>
              </TabsTrigger>
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Blog</span>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Galerie</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Avis</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="accommodation" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Hébergement</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>
            <TabsContent value="activities">
              <AdminActivities />
            </TabsContent>
            <TabsContent value="articles">
              <AdminArticles />
            </TabsContent>
            <TabsContent value="gallery">
              <AdminGallery />
            </TabsContent>
            <TabsContent value="reviews">
              <AdminReviews />
            </TabsContent>
            <TabsContent value="chat">
              <AdminChat />
            </TabsContent>
            <TabsContent value="accommodation">
              <AdminAccommodation />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
