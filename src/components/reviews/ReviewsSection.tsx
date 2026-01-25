import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { supabase } from "@/integrations/supabase/client";

import { calculateProfileCompletion, type ProfileForCompletion } from "@/lib/profile-utils";

interface Review {
  id: string;
  content: string;
  rating: number;
  photo_urls: string[];
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  isVerified?: boolean;
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReviews();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("user_reviews")
        .select(`
          id,
          content,
          rating,
          photo_urls,
          created_at,
          user_id
        `)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      // Fetch profiles for each review (including completion fields)
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url, phone, riding_level, riding_experience_years, dream_destinations, preferred_trip_types, interests, riding_style, travel_companions")
          .in("user_id", userIds);

        const profilesMap = new Map(
          profilesData?.map((p) => [p.user_id, p]) || []
        );

        const reviewsWithProfiles = data.map((review) => {
          const profile = profilesMap.get(review.user_id) || null;
          const isVerified = profile ? calculateProfileCompletion(profile as ProfileForCompletion) === 100 : false;
          return {
            ...review,
            profiles: profile,
            isVerified,
          };
        });

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Avis de nos cavaliers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez les expériences partagées par notre communauté de passionnés
          </p>

          {reviews.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(Number(averageRating))
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold">{averageRating}</span>
              <span className="text-muted-foreground">
                ({reviews.length} avis)
              </span>
            </div>
          )}
        </div>

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun avis pour le moment. Soyez le premier à partager votre expérience !</p>
          </div>
        )}

        {/* CTA / Form */}
        <div className="max-w-xl mx-auto">
          {user ? (
            showForm ? (
              <ReviewForm
                userId={user.id}
                onSuccess={() => {
                  setShowForm(false);
                  fetchReviews();
                }}
              />
            ) : (
              <div className="text-center">
                <Button onClick={() => setShowForm(true)} size="lg">
                  <MessageSquarePlus className="w-5 h-5 mr-2" />
                  Laisser un avis
                </Button>
              </div>
            )
          ) : (
            <div className="text-center bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-8">
              <p className="text-muted-foreground mb-4">
                Connectez-vous pour partager votre expérience avec notre communauté
              </p>
              <Button asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
