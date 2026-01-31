import { useState } from "react";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema for reviews
const reviewSchema = z.object({
  rating: z.number().min(1, "Veuillez sélectionner une note").max(5),
  content: z.string()
    .trim()
    .min(10, "Votre avis doit contenir au moins 10 caractères")
    .max(1000, "Votre avis ne peut pas dépasser 1000 caractères"),
});

// Constantes pour la gestion des images
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const COMPRESSION_QUALITY = 0.8;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;

// Fonction de compression d'image
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Si le fichier est déjà petit, pas besoin de compresser
    if (file.size <= MAX_FILE_SIZE_BYTES) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Redimensionner si trop grand
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not compress image"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          COMPRESSION_QUALITY
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
};

interface ReviewFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ userId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 2) {
      toast.error("Maximum 2 photos autorisées");
      return;
    }

    // Vérifier les formats acceptés
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Formats acceptés : JPG, PNG, WebP, GIF");
      return;
    }

    // Vérifier si les fichiers sont trop lourds (avant compression)
    const tooLargeFiles = files.filter((f) => f.size > 10 * 1024 * 1024); // 10 Mo max avant compression
    if (tooLargeFiles.length > 0) {
      toast.error("Les photos ne doivent pas dépasser 10 Mo");
      return;
    }

    setIsCompressing(true);
    try {
      // Compresser les images si nécessaire
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.size > MAX_FILE_SIZE_BYTES) {
            const compressed = await compressImage(file);
            toast.info(`Photo "${file.name}" compressée automatiquement`);
            return compressed;
          }
          return file;
        })
      );

      const newPhotos = [...photos, ...compressedFiles].slice(0, 2);
      setPhotos(newPhotos);

      // Create previews
      const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
      setPhotosPreviews(newPreviews);
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Erreur lors du traitement de l'image");
    } finally {
      setIsCompressing(false);
    }
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

    // Validate input using zod schema
    const result = reviewSchema.safeParse({ rating, content });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      // Use validated and sanitized data
      const { error } = await supabase.from("user_reviews").insert({
        user_id: userId,
        rating: result.data.rating,
        content: result.data.content,
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
            <p className="text-xs text-muted-foreground">
              Formats : JPG, PNG, WebP, GIF • Max 2 Mo (compression auto si besoin)
            </p>
            <div className="flex gap-3 flex-wrap items-center">
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
                <label className={`w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${isCompressing ? "opacity-50 pointer-events-none" : ""}`}>
                  {isCompressing ? (
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Ajouter</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={isCompressing}
                  />
                </label>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || isCompressing} className="w-full">
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
