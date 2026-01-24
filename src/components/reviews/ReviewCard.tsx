import { Star, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReviewCardProps {
  review: {
    id: string;
    content: string;
    rating: number;
    photo_urls: string[];
    created_at: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
    isVerified?: boolean;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = `${review.profiles?.first_name?.[0] || ""}${review.profiles?.last_name?.[0] || ""}`.toUpperCase() || "U";
  const displayName = review.profiles?.first_name
    ? `${review.profiles.first_name} ${review.profiles.last_name?.[0] || ""}.`
    : "Utilisateur";

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={review.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {review.isVerified && (
              <span className="absolute -bottom-0.5 -right-0.5">
                <BadgeCheck className="h-4 w-4 text-green-600 fill-green-100" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{displayName}</p>
                {review.isVerified && (
                  <Badge 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0 gap-1 bg-green-500/10 text-green-700 border-green-500/30"
                  >
                    <BadgeCheck className="h-2.5 w-2.5" />
                    Vérifié
                  </Badge>
                )}
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
            </p>

            <p className="text-muted-foreground leading-relaxed">{review.content}</p>

            {review.photo_urls && review.photo_urls.length > 0 && (
              <div className="flex gap-2 mt-4">
                {review.photo_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-20 h-20 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
