import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, Upload, X, Image as ImageIcon } from "lucide-react";

const CATEGORIES = [
  "Randonnées",
  "Fermes Pédagogiques",
  "Patrimoine",
  "Nature",
  "Gastronomie",
  "Artisanat",
  "Loisirs",
];

interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  location_name: string;
  location_address: string;
  location_phone: string;
  location_email: string;
  location_website: string;
  distance_from_arwen: string;
  category: string;
  featured_image: string;
  images: string[];
}

const initialFormData: ArticleFormData = {
  title: "",
  excerpt: "",
  content: "",
  location_name: "",
  location_address: "",
  location_phone: "",
  location_email: "",
  location_website: "",
  distance_from_arwen: "",
  category: "",
  featured_image: "",
  images: [],
};

export const EcosystemArticleCreator = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Generate article with AI
  const generateWithAI = async () => {
    if (!aiTopic.trim() || !formData.category) {
      toast.error("Veuillez saisir un sujet et une catégorie");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ecosystem-article", {
        body: {
          topic: aiTopic,
          category: formData.category,
        },
      });

      if (error) {
        console.error("AI generation error:", error);
        // Vérifier si c'est une erreur de rate limit ou paiement
        if (error.message?.includes("429")) {
          toast.error("Limite de requêtes atteinte, réessayez plus tard");
        } else if (error.message?.includes("402")) {
          toast.error("Crédits insuffisants pour l'IA");
        } else {
          toast.error(`Erreur de génération: ${error.message || "Erreur inconnue"}`);
        }
        return;
      }

      if (data?.error) {
        toast.error(`Erreur: ${data.error}`);
        return;
      }

      if (data?.article) {
        toast.success("Article généré et enregistré avec succès !");
        setFormData(initialFormData);
        setAiTopic("");
        queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-articles"] });
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("Erreur lors de la génération de l'article");
    } finally {
      setIsGenerating(false);
    }
  };

  // Create article manually
  const createArticleMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title || !formData.category) {
        throw new Error("Le titre et la catégorie sont requis");
      }

      // Create slug from title
      const slug = formData.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data, error } = await supabase
        .from("ecosystem_articles")
        .insert({
          title: formData.title,
          slug: slug,
          excerpt: formData.excerpt || null,
          content: formData.content || null,
          featured_image: formData.featured_image || null,
          images: formData.images.length > 0 ? formData.images : null,
          category: formData.category,
          location_name: formData.location_name || null,
          location_address: formData.location_address || null,
          location_phone: formData.location_phone || null,
          location_email: formData.location_email || null,
          location_website: formData.location_website || null,
          distance_from_arwen: formData.distance_from_arwen || null,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Article créé avec succès !");
      setFormData(initialFormData);
      queryClient.invalidateQueries({ queryKey: ["admin-ecosystem-articles"] });
    },
    onError: (error) => {
      console.error("Create article error:", error);
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleInputChange = (field: keyof ArticleFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, newImageUrl.trim()],
      }));
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Section Génération IA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Génération IA
          </CardTitle>
          <CardDescription>
            Générez automatiquement un article complet avec l'IA (utilise Perplexity pour rechercher des informations réelles)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ai-category">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger id="ai-category">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-topic">Sujet / Lieu à rechercher *</Label>
              <Input
                id="ai-topic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ex: Forêt de Brocéliande, Château de Fougères..."
              />
            </div>
          </div>
          <Button
            onClick={generateWithAI}
            disabled={isGenerating || !aiTopic.trim() || !formData.category}
            className="w-full md:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer l'article avec l'IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Section Création Manuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Création manuelle
          </CardTitle>
          <CardDescription>
            Créez un article Éco-Système manuellement avec vos propres textes et images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Titre de l'article"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-manual">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger id="category-manual">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Résumé / Chapô</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => handleInputChange("excerpt", e.target.value)}
              placeholder="Introduction courte et accrocheuse..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenu de l'article</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange("content", e.target.value)}
              placeholder="Contenu complet de l'article..."
              rows={10}
            />
          </div>

          {/* Informations du lieu */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-medium mb-4">Informations du lieu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_name">Nom du lieu</Label>
                <Input
                  id="location_name"
                  value={formData.location_name}
                  onChange={(e) => handleInputChange("location_name", e.target.value)}
                  placeholder="Nom du lieu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distance_from_arwen">Distance depuis An Arwen</Label>
                <Input
                  id="distance_from_arwen"
                  value={formData.distance_from_arwen}
                  onChange={(e) => handleInputChange("distance_from_arwen", e.target.value)}
                  placeholder="Ex: 15 km (20 min)"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location_address">Adresse</Label>
                <Input
                  id="location_address"
                  value={formData.location_address}
                  onChange={(e) => handleInputChange("location_address", e.target.value)}
                  placeholder="Adresse complète"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_phone">Téléphone</Label>
                <Input
                  id="location_phone"
                  value={formData.location_phone}
                  onChange={(e) => handleInputChange("location_phone", e.target.value)}
                  placeholder="02 XX XX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_email">Email</Label>
                <Input
                  id="location_email"
                  type="email"
                  value={formData.location_email}
                  onChange={(e) => handleInputChange("location_email", e.target.value)}
                  placeholder="contact@exemple.fr"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location_website">Site web</Label>
                <Input
                  id="location_website"
                  type="url"
                  value={formData.location_website}
                  onChange={(e) => handleInputChange("location_website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-medium mb-4">Images</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="featured_image">Image à la une (URL)</Label>
                <Input
                  id="featured_image"
                  type="url"
                  value={formData.featured_image}
                  onChange={(e) => handleInputChange("featured_image", e.target.value)}
                  placeholder="https://..."
                />
                {formData.featured_image && (
                  <div className="w-full max-w-md h-40 rounded overflow-hidden bg-muted">
                    <img
                      src={formData.featured_image}
                      alt="Prévisualisation"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Galerie d'images</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="URL de l'image à ajouter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addImageUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-video rounded overflow-hidden bg-muted">
                          <img
                            src={url}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              onClick={() => createArticleMutation.mutate()}
              disabled={createArticleMutation.isPending || !formData.title || !formData.category}
            >
              {createArticleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer l'article
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
