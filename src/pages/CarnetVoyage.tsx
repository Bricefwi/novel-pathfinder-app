import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight, Plus, Edit, Trash2, Save, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";

// Import fallback images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
}

const fallbackImages = [
  cavaliersPlageCoucherSoleil,
  marocDunesCavaliers,
  bretagnVillageChevaux,
  marocCanyonCavaliers,
  marocEssaouiraBateau,
];

const CarnetVoyage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category: "carnet-voyage",
    tags: "",
  });

  useEffect(() => {
    fetchArticles();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setIsAdmin(!!data);
    }
  };

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = generateSlug(formData.title);
    const articleData = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || null,
      content: formData.content || null,
      featured_image: formData.featured_image || null,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : null,
      is_published: true,
      published_at: new Date().toISOString(),
    };

    if (editingArticle) {
      const { error } = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", editingArticle.id);

      if (error) {
        toast.error("Erreur lors de la mise à jour");
      } else {
        toast.success("Article mis à jour !");
        fetchArticles();
      }
    } else {
      const { error } = await supabase
        .from("articles")
        .insert(articleData);

      if (error) {
        toast.error("Erreur lors de la création");
        console.error(error);
      } else {
        toast.success("Article créé !");
        fetchArticles();
      }
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content || "",
      featured_image: article.featured_image || "",
      category: article.category || "carnet-voyage",
      tags: article.tags?.join(", ") || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    
    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Article supprimé");
      fetchArticles();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      featured_image: "",
      category: "carnet-voyage",
      tags: "",
    });
    setEditingArticle(null);
  };

  const getArticleImage = (article: Article, index: number) => {
    if (article.featured_image) return article.featured_image;
    return fallbackImages[index % fallbackImages.length];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const featuredArticles = articles.slice(0, 2);
  const otherArticles = articles.slice(2);

  return (
    <Layout>
      <SEOHead {...seoConfigs.carnetVoyage} />
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marocDesertNuages})` }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm">
            Nos Aventures
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            Carnet de Voyage
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto">
            Revivez nos plus belles aventures équestres à travers la Bretagne et au Maroc.
          </p>
          
          {/* Admin Add Button */}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="mt-8 gap-2">
                  <Plus className="h-5 w-5" />
                  Nouvel article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingArticle ? "Modifier l'article" : "Nouvel article"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Titre *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre de l'article"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Résumé</label>
                    <Textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Bref résumé de l'article..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Contenu</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Contenu de l'article..."
                      rows={8}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">URL de l'image</label>
                    <Input
                      value={formData.featured_image}
                      onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Tags (séparés par des virgules)</label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="Bretagne, Aventure, Plage..."
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 gap-2">
                      <Save className="h-4 w-4" />
                      {editingArticle ? "Mettre à jour" : "Publier"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setIsDialogOpen(false);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      {/* Featured Stories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <span className="text-primary font-medium tracking-wide uppercase text-sm">
              À la une
            </span>
            <h2 className="font-serif text-4xl font-bold text-foreground mt-2">
              Récits récents
            </h2>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-[500px] rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : featuredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {featuredArticles.map((article, index) => (
                <article 
                  key={article.id}
                  className="group relative h-[500px] rounded-3xl overflow-hidden"
                >
                  <img 
                    src={getArticleImage(article, index)} 
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <div className="flex items-center gap-4 text-primary-foreground/80 text-sm mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(article.published_at || article.created_at)}
                      </span>
                      {article.tags?.[0] && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {article.tags[0]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-3xl font-bold text-primary-foreground mb-3 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-primary-foreground/90 mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all cursor-pointer">
                        Lire la suite
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(article);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(article.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Aucun article pour le moment</h3>
                <p className="text-muted-foreground">
                  Les récits de nos aventures arriveront bientôt !
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Other Articles */}
      {otherArticles.length > 0 && (
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-medium tracking-wide uppercase text-sm">
                Archives
              </span>
              <h2 className="font-serif text-4xl font-bold text-foreground mt-4">
                Tous nos souvenirs
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherArticles.map((article, index) => (
                <article 
                  key={article.id}
                  className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img 
                      src={getArticleImage(article, index + 2)} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => handleEdit(article)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.published_at || article.created_at)}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Créez votre propre aventure
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Rejoignez-nous pour vivre des moments inoubliables à cheval.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/destinations">
              <Button size="lg" className="group">
                Voir nos destinations
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CarnetVoyage;
