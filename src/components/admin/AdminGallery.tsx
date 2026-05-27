import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, Star, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type GalleryPhoto = Tables<"gallery_photos"> & {
  media_type?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  image_url: "",
  video_url: "",
  thumbnail_url: "",
  media_type: "image" as "image" | "video",
  category: "general",
  is_featured: false,
};

export function AdminGallery() {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setPhotos((data as GalleryPhoto[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.media_type === "video" && !formData.video_url) {
      toast({ title: "URL de la vidéo requise", variant: "destructive" });
      return;
    }
    if (formData.media_type === "image" && !formData.image_url) {
      toast({ title: "URL de l'image requise", variant: "destructive" });
      return;
    }

    const payload: any = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      is_featured: formData.is_featured,
      media_type: formData.media_type,
      // image_url is NOT NULL en base : on y stocke aussi la miniature pour les vidéos
      image_url:
        formData.media_type === "video"
          ? formData.thumbnail_url || formData.video_url
          : formData.image_url,
      video_url: formData.media_type === "video" ? formData.video_url : null,
      thumbnail_url: formData.media_type === "video" ? formData.thumbnail_url || null : null,
    };

    const { error } = await supabase.from("gallery_photos").insert(payload);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: formData.media_type === "video" ? "Vidéo ajoutée" : "Photo ajoutée" });
      fetchPhotos();
      setIsDialogOpen(false);
      setFormData(emptyForm);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet élément ?")) return;

    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Élément supprimé" });
      fetchPhotos();
    }
  };

  const toggleFeatured = async (photo: GalleryPhoto) => {
    const { error } = await supabase
      .from("gallery_photos")
      .update({ is_featured: !photo.is_featured })
      .eq("id", photo.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      fetchPhotos();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion de la galerie (photos & vidéos)</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Ajouter un média</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un média à la galerie</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs
                value={formData.media_type}
                onValueChange={(v) => setFormData({ ...formData, media_type: v as "image" | "video" })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">Photo</TabsTrigger>
                  <TabsTrigger value="video">Vidéo</TabsTrigger>
                </TabsList>
              </Tabs>

              {formData.media_type === "image" ? (
                <div className="space-y-2">
                  <Label htmlFor="image_url">URL de l'image *</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">URL de la vidéo *</Label>
                    <Input
                      id="video_url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://... .mp4 ou YouTube/Vimeo"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Acceptés : fichier .mp4/.webm, ou lien YouTube/Vimeo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">Miniature (optionnel)</Label>
                    <Input
                      id="thumbnail_url"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      placeholder="URL d'une image d'aperçu"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} />
                Mettre en avant
              </label>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.length === 0 ? (
          <p className="col-span-full text-muted-foreground text-center py-8">Aucun média</p>
        ) : (
          photos.map((photo) => {
            const isVideo = photo.media_type === "video";
            const preview = photo.thumbnail_url || photo.image_url;
            return (
              <Card key={photo.id} className="overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {isVideo && photo.video_url && !photo.thumbnail_url ? (
                    <video src={photo.video_url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={preview} alt={photo.title || ""} className="w-full h-full object-cover" />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                      <Play className="h-10 w-10 text-primary-foreground" />
                    </div>
                  )}
                  {photo.is_featured && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                      ⭐ Featured
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="font-medium truncate">{photo.title || "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isVideo ? "Vidéo" : "Photo"} · {photo.category}
                  </p>
                  <div className="flex justify-end gap-1 mt-2">
                    <Button variant="ghost" size="icon" onClick={() => toggleFeatured(photo)}>
                      <Star className={`h-4 w-4 ${photo.is_featured ? "fill-primary text-primary" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(photo.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
