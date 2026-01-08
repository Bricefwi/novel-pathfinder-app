import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  user_id: string;
  content: string;
  rating: number;
  photo_urls: string[] | null;
  is_approved: boolean | null;
  created_at: string;
  profile?: { first_name: string | null; last_name: string | null } | null;
}

export function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("user_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setReviews([]);
    } else {
      // Fetch profiles separately
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      setReviews((data || []).map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || null
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("user_reviews")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avis approuvé" });
      fetchReviews();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("user_reviews")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avis supprimé" });
      fetchReviews();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const pendingReviews = reviews.filter(r => !r.is_approved);
  const approvedReviews = reviews.filter(r => r.is_approved);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Modération des avis</h2>

      {pendingReviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-amber-600">En attente de validation ({pendingReviews.length})</h3>
          {pendingReviews.map((review) => (
            <Card key={review.id} className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {review.profile?.first_name || "Utilisateur"} {review.profile?.last_name || ""}
                      </span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-sm">{review.content}</p>
                    {review.photo_urls && review.photo_urls.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {review.photo_urls.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleApprove(review.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(review.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-medium text-green-600">Avis approuvés ({approvedReviews.length})</h3>
        {approvedReviews.length === 0 ? (
          <p className="text-muted-foreground">Aucun avis approuvé</p>
        ) : (
          approvedReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {review.profile?.first_name || "Utilisateur"} {review.profile?.last_name || ""}
                      </span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">{review.content}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(review.id)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
