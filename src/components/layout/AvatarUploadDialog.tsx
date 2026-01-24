import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, Upload } from "lucide-react";

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAvatarUrl: string | null;
  userInitials: string;
  onAvatarUpdate: (newUrl: string) => void;
}

export function AvatarUploadDialog({
  open,
  onOpenChange,
  userId,
  currentAvatarUrl,
  userInitials,
  onAvatarUpdate,
}: AvatarUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      onAvatarUpdate(publicUrl);
      toast.success("Photo de profil mise à jour !");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'upload");
    }
    setUploading(false);
    setPreviewUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Changer ma photo de profil</DialogTitle>
          <DialogDescription>
            Cliquez sur l'avatar ou glissez une image pour la mettre à jour
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Avatar Preview */}
          <div 
            className="relative cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              {(previewUrl || currentAvatarUrl) ? (
                <AvatarImage src={previewUrl || currentAvatarUrl || undefined} alt="Avatar" />
              ) : null}
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full max-w-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Choisir une photo
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Formats acceptés : JPG, PNG, GIF. Taille max : 2 Mo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
