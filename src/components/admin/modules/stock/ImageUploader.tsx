import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  bucketName?: string;
}

export function ImageUploader({
  images,
  onChange,
  maxImages = 5,
  bucketName = "activity-images",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou GIF.");
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 5 Mo");
      return null;
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `sejours/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images autorisées`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file) => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        onChange([...images, ...successfulUploads]);
        toast.success(`${successfulUploads.length} image(s) uploadée(s)`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Erreur lors de l'upload. Vérifiez vos permissions.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images autorisées`);
      return;
    }

    const filesToUpload = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast.error("Aucune image valide trouvée");
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file) => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        onChange([...images, ...successfulUploads]);
        toast.success(`${successfulUploads.length} image(s) uploadée(s)`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-[4/3] rounded-lg overflow-hidden border">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              {index === 0 && (
                <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Image principale
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {images.length < maxImages && (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            uploading ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Glissez-déposez des images ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP ou GIF • Max 5 Mo par image • {images.length}/{maxImages} images
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
}
