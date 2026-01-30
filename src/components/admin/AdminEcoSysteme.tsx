import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  FileText, 
  Check, 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Eye, 
  Loader2,
  ExternalLink,
  Mail,
  MapPin,
  Plus,
  Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EcosystemArticleCreator } from "./ecosystem/EcosystemArticleCreator";

interface EcosystemSuggestion {
  id: string;
  suggester_name: string;
  suggester_email: string;
  location_name: string;
  location_address: string | null;
  location_website: string | null;
  category: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface EcosystemArticle {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  featured_image_override: string | null;
  images: string[] | null;
  images_override: string[] | null;
  category: string | null;
  is_published: boolean | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  generated: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
  generated: "Article généré",
};

export const AdminEcoSysteme = () => {
  const queryClient = useQueryClient();
  const [selectedSuggestion, setSelectedSuggestion] = useState<EcosystemSuggestion | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<EcosystemArticle | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [imageOverride, setImageOverride] = useState("");
  const [galleryOverride, setGalleryOverride] = useState("");

  // Fetch suggestions
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["admin-ecosystem-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecosystem_suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EcosystemSuggestion[];
    },
  });

  // Fetch articles for image management
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["admin-ecosystem-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecosystem_articles")
        .select("id, title, slug, featured_image, featured_image_override, images, images_override, category, is_published, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EcosystemArticle[];
    },
  });

  // Update suggestion status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("ecosystem_suggestions")
        .update({ 
          status, 
          admin_notes: notes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-suggestions"] });
      toast.success("Statut mis à jour");
      setSelectedSuggestion(null);
    },
  });

  // Generate article from suggestion
  const generateArticleMutation = useMutation({
    mutationFn: async (suggestion: EcosystemSuggestion) => {
      setGenerating(suggestion.id);
      
      const { data, error } = await supabase.functions.invoke("generate-ecosystem-article", {
        body: {
          topic: `${suggestion.location_name} - ${suggestion.description}`,
          category: suggestion.category,
        },
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de l'appel à la fonction");
      }
      
      // Vérifier si la réponse contient une erreur
      if (data?.error) {
        console.error("API error:", data.error);
        throw new Error(data.error);
      }
      
      if (!data?.article) {
        throw new Error("Aucun article n'a été généré");
      }
      
      // Update suggestion status
      await supabase
        .from("ecosystem_suggestions")
        .update({ 
          status: "generated",
          generated_article_id: data.article?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", suggestion.id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-articles"] });
      toast.success("Article généré avec succès !");
      setGenerating(null);
    },
    onError: (error: Error) => {
      console.error("Generation error:", error);
      toast.error(`Erreur: ${error.message || "Erreur lors de la génération"}`);
      setGenerating(null);
    },
  });

  // Update article images
  const updateImagesMutation = useMutation({
    mutationFn: async ({ id, featured, gallery }: { id: string; featured?: string; gallery?: string[] }) => {
      const updates: Record<string, unknown> = {};
      if (featured !== undefined) updates.featured_image_override = featured || null;
      if (gallery !== undefined) updates.images_override = gallery.length > 0 ? gallery : null;
      
      const { error } = await supabase
        .from("ecosystem_articles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-articles"] });
      toast.success("Images mises à jour");
      setSelectedArticle(null);
      setImageOverride("");
      setGalleryOverride("");
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from("ecosystem_articles")
        .delete()
        .eq("id", articleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-articles"] });
      toast.success("Article supprimé");
    },
    onError: (error: Error) => {
      console.error("Delete error:", error);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  const handleApproveAndGenerate = (suggestion: EcosystemSuggestion) => {
    generateArticleMutation.mutate(suggestion);
  };

  const handleReject = (suggestion: EcosystemSuggestion, notes: string) => {
    updateStatusMutation.mutate({ id: suggestion.id, status: "rejected", notes });
  };

  const handleSaveImages = () => {
    if (!selectedArticle) return;
    
    const galleryArray = galleryOverride
      .split("\n")
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    updateImagesMutation.mutate({
      id: selectedArticle.id,
      featured: imageOverride,
      gallery: galleryArray,
    });
  };

  const getDisplayImage = (article: EcosystemArticle) => {
    return article.featured_image_override || article.featured_image;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create">
        <TabsList className="mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Créer un article
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Suggestions ({suggestions?.filter(s => s.status === "pending").length || 0})
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Gestion des images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <EcosystemArticleCreator />
        </TabsContent>

        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Suggestions de lieux</CardTitle>
              <CardDescription>
                Gérez les propositions de lieux envoyées par les visiteurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <p>Chargement...</p>
              ) : suggestions && suggestions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Proposé par</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((suggestion) => (
                      <TableRow key={suggestion.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{suggestion.location_name}</p>
                            {suggestion.location_address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {suggestion.location_address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{suggestion.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{suggestion.suggester_name}</p>
                            <a 
                              href={`mailto:${suggestion.suggester_email}`}
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {suggestion.suggester_email}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(suggestion.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[suggestion.status]}>
                            {statusLabels[suggestion.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {suggestion.status === "pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleApproveAndGenerate(suggestion)}
                                  disabled={generating === suggestion.id}
                                  title="Approuver et générer l'article"
                                >
                                  {generating === suggestion.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" title="Refuser">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Refuser la suggestion</DialogTitle>
                                      <DialogDescription>
                                        Indiquez la raison du refus (optionnel)
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <Textarea 
                                        id={`reject-notes-${suggestion.id}`}
                                        placeholder="Raison du refus..."
                                        rows={3}
                                      />
                                      <Button 
                                        variant="destructive" 
                                        className="w-full"
                                        onClick={() => {
                                          const textarea = document.getElementById(`reject-notes-${suggestion.id}`) as HTMLTextAreaElement;
                                          handleReject(suggestion, textarea?.value || "");
                                        }}
                                      >
                                        Confirmer le refus
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" title="Voir les détails">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>{suggestion.location_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-muted-foreground">Catégorie</Label>
                                    <p>{suggestion.category}</p>
                                  </div>
                                  {suggestion.location_address && (
                                    <div>
                                      <Label className="text-muted-foreground">Adresse</Label>
                                      <p>{suggestion.location_address}</p>
                                    </div>
                                  )}
                                  {suggestion.location_website && (
                                    <div>
                                      <Label className="text-muted-foreground">Site web</Label>
                                      <a 
                                        href={suggestion.location_website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1"
                                      >
                                        {suggestion.location_website}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  )}
                                  <div>
                                    <Label className="text-muted-foreground">Description</Label>
                                    <p className="text-sm whitespace-pre-wrap">{suggestion.description}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Proposé par</Label>
                                    <p>{suggestion.suggester_name} ({suggestion.suggester_email})</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune suggestion pour le moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des images des articles</CardTitle>
              <CardDescription>
                Corrigez les images à la une et les galeries des articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <p>Chargement...</p>
              ) : articles && articles.length > 0 ? (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div 
                      key={article.id} 
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                        {getDisplayImage(article) ? (
                          <img 
                            src={getDisplayImage(article) || ""} 
                            alt={article.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{article.category}</Badge>
                          {article.featured_image_override && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Image personnalisée</Badge>
                          )}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedArticle(article);
                              setImageOverride(article.featured_image_override || "");
                              setGalleryOverride((article.images_override || []).join("\n"));
                            }}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Modifier les images
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Modifier les images</DialogTitle>
                            <DialogDescription>
                              {article.title}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Image à la une (URL)</Label>
                              <Input
                                value={imageOverride}
                                onChange={(e) => setImageOverride(e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                              />
                              <p className="text-xs text-muted-foreground">
                                Laissez vide pour utiliser l'image générée automatiquement
                              </p>
                              {imageOverride && (
                                <div className="w-full h-32 rounded overflow-hidden bg-muted">
                                  <img 
                                    src={imageOverride} 
                                    alt="Prévisualisation"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Images de la galerie (une URL par ligne)</Label>
                              <Textarea
                                value={galleryOverride}
                                onChange={(e) => setGalleryOverride(e.target.value)}
                                placeholder="https://images.unsplash.com/...&#10;https://images.unsplash.com/..."
                                rows={4}
                              />
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={handleSaveImages}
                              disabled={updateImagesMutation.isPending}
                            >
                              {updateImagesMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Delete article button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. L'article "{article.title}" sera définitivement supprimé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteArticleMutation.mutate(article.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun article pour le moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
