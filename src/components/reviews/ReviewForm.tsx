import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ userId, onSuccess }: ReviewFormProps) {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 2) {
      toast.error("Maximum 2 photos autorisées");
      return;
    }

    const newPhotos = [...photos, ...files].slice(0, 2);
    setPhotos(newPhotos);

    // Create previews
    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
    setPhotosPreviews(newPreviews);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photosPreviews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotosPreviews(newPreviews);
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];

    for (const photo of photos) {
      const fileExt = photo.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("review-photos")
        .upload(fileName, photo);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("review-photos")
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    if (content.trim().length < 10) {
      toast.error("Votre avis doit contenir au moins 10 caractères");
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const { error } = await supabase.from("user_reviews").insert({
        user_id: userId,
        rating,
        content: content.trim(),
        photo_urls: photoUrls,
      });

      if (error) throw error;

      toast.success("Merci pour votre avis ! Il sera visible après validation.");
      setRating(0);
      setContent("");
      setPhotos([]);
      setPhotosPreviews([]);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Erreur lors de l'envoi de votre avis");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Partagez votre expérience</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Votre note</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Votre commentaire</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Racontez-nous votre expérience..."
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/1000
            </p>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Photos (optionnel, max 2)</label>
            <div className="flex gap-3 flex-wrap">
              {photosPreviews.map((preview, index) => (
                <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 2 && (
                <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              "Publier mon avis"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
