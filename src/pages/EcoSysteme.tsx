import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { 
  MapPin, 
  Phone, 
  Globe, 
  Navigation,
  Leaf,
  Mountain,
  Castle,
  Trees,
  Compass,
  ChevronRight,
  Calendar,
  Eye,
  Send,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";

// Import images for hero and decorations
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";

interface EcosystemArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  featured_image_override: string | null;
  category: string | null;
  location_name: string | null;
  location_address: string | null;
  location_phone: string | null;
  location_email: string | null;
  location_website: string | null;
  distance_from_arwen: string | null;
  tags: string[] | null;
  views_count: number | null;
  published_at: string | null;
  created_at: string;
}

// Validation schema for suggestion form
const suggestionSchema = z.object({
  suggester_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  suggester_email: z.string().trim().email("Email invalide").max(255),
  location_name: z.string().trim().min(3, "Le nom du lieu doit contenir au moins 3 caractères").max(200),
  location_website: z.string().trim().url("URL invalide").optional().or(z.literal("")),
  category: z.enum(["randonnee", "ferme-pedagogique", "patrimoine", "nature"]),
  description: z.string().trim().min(20, "La description doit contenir au moins 20 caractères").max(2000),
});

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  "randonnee": { icon: Mountain, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", label: "Randonnée" },
  "ferme-pedagogique": { icon: Leaf, color: "bg-amber-500/10 text-amber-700 border-amber-500/30", label: "Ferme Pédagogique" },
  "patrimoine": { icon: Castle, color: "bg-rose-500/10 text-rose-700 border-rose-500/30", label: "Patrimoine" },
  "nature": { icon: Trees, color: "bg-teal-500/10 text-teal-700 border-teal-500/30", label: "Nature & Écologie" },
  "decouverte": { icon: Compass, color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30", label: "Découverte" },
};

const categories = [
  { id: "all", label: "Tous", icon: Compass },
  { id: "randonnee", label: "Randonnées", icon: Mountain },
  { id: "ferme-pedagogique", label: "Fermes Pédagogiques", icon: Leaf },
  { id: "patrimoine", label: "Patrimoine & Culture", icon: Castle },
  { id: "nature", label: "Nature & Écologie", icon: Trees },
];

const suggestionCategories = [
  { id: "randonnee", label: "Randonnée / Sentier", icon: Mountain },
  { id: "ferme-pedagogique", label: "Ferme Pédagogique", icon: Leaf },
  { id: "patrimoine", label: "Patrimoine & Culture", icon: Castle },
  { id: "nature", label: "Nature & Écologie", icon: Trees },
];

/** Normalise une URL pour garantir un protocole absolu */
const normalizeUrl = (url: string): string => {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
};

const ArticleCard = ({ article }: { article: EcosystemArticle }) => {
  const config = categoryConfig[article.category || "decouverte"] || categoryConfig["decouverte"];
  const IconComponent = config.icon;
  
  // Utiliser l'image override si disponible
  const displayImage = article.featured_image_override || article.featured_image || bretagnVillageChevaux;
  
  return (
    <Card className="group overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={displayImage}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = bretagnVillageChevaux;
          }}
        />
        {/* Overlay gradient pour améliorer la lisibilité des badges */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-transparent to-foreground/60" />
        
        {/* Badges repositionnés avec meilleur contraste */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <Badge className={`${config.color} border text-xs tracking-wider font-medium flex items-center gap-1.5 shadow-md`}>
            <IconComponent className="h-3 w-3" />
            {config.label}
          </Badge>
          {article.distance_from_arwen && (
            <Badge className="bg-background text-foreground border-none shadow-lg flex items-center gap-1.5 text-xs font-medium">
              <Navigation className="h-3 w-3 text-primary" />
              {article.distance_from_arwen}
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-6">
        <h3 className="font-serif text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {article.location_name && (
          <p className="text-primary font-medium text-sm mb-2 flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {article.location_name}
          </p>
        )}
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
          {article.excerpt}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {article.location_phone && (
            <a 
              href={`tel:${article.location_phone}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-3 w-3" />
              {article.location_phone}
            </a>
          )}
          {article.location_website && (
            <a 
              href={normalizeUrl(article.location_website)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="h-3 w-3" />
              Site web
            </a>
          )}
        </div>
        
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {article.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(article.published_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            )}
            {article.views_count !== null && article.views_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.views_count} vues
              </span>
            )}
          </div>
          <Link 
            to={`/eco-systeme/${article.slug}`}
            className="text-primary font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
          >
            Lire
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Suggestion Form Component
const SuggestionForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    suggester_name: "",
    suggester_email: "",
    location_name: "",
    location_website: "",
    category: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = suggestionSchema.safeParse(form);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("ecosystem_suggestions")
        .insert({
          suggester_name: form.suggester_name.trim(),
          suggester_email: form.suggester_email.trim(),
          location_name: form.location_name.trim(),
          location_website: form.location_website.trim() || null,
          category: form.category,
          description: form.description.trim(),
          status: "pending",
        });

      if (error) throw error;

      toast.success("Merci pour votre suggestion ! Notre équipe l'examinera prochainement.");
      onSuccess();
    } catch (err) {
      console.error("Error submitting suggestion:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suggester_name">Votre nom *</Label>
          <Input
            id="suggester_name"
            value={form.suggester_name}
            onChange={(e) => setForm(prev => ({ ...prev, suggester_name: e.target.value }))}
            placeholder="Jean Dupont"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suggester_email">Votre email *</Label>
          <Input
            id="suggester_email"
            type="email"
            value={form.suggester_email}
            onChange={(e) => setForm(prev => ({ ...prev, suggester_email: e.target.value }))}
            placeholder="jean@email.com"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="location_name">Nom du lieu *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location_name"
            value={form.location_name}
            onChange={(e) => setForm(prev => ({ ...prev, location_name: e.target.value }))}
            placeholder="Ex: Forêt de Brocéliande"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location_website">Site web (optionnel)</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location_website"
            type="url"
            value={form.location_website}
            onChange={(e) => setForm(prev => ({ ...prev, location_website: e.target.value }))}
            placeholder="https://..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Catégorie *</Label>
        <Select value={form.category} onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {suggestionCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Pourquoi ce lieu ? *</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez ce qui rend ce lieu spécial..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">Minimum 20 caractères</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Envoi en cours..." : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Envoyer ma suggestion
          </>
        )}
      </Button>
    </form>
  );
};

const EcoSysteme = () => {
  const [articles, setArticles] = useState<EcosystemArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ecosystem_articles")
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

  const filteredArticles = selectedCategory === "all" 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  return (
    <>
      <SEOHead
        title="Éco-Système - Découvertes Nature & Patrimoine en Bretagne"
        description="Explorez l'éco-tourisme breton : randonnées pédestres, fermes pédagogiques, châteaux, sites naturels près de la Ferme Équestre An Arwen."
        keywords="éco-tourisme Bretagne, randonnée pédestre Ille-et-Vilaine, ferme pédagogique, patrimoine breton, nature Bretagne"
      />
      <Layout>
        {/* Hero Section */}
        <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={korrigansForetChevaux}
              alt="Forêt bretonne"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-background" />
          </div>
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/30">
              <Leaf className="h-3 w-3 mr-1.5" />
              Éco-Tourisme Breton
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 drop-shadow-lg">
              Éco-Système
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto drop-shadow-md">
              Découvrez les trésors naturels, culturels et pédagogiques autour de la Ferme Équestre An Arwen
            </p>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Au cœur de la Bretagne, à proximité de notre ferme équestre, s'épanouit un écosystème riche 
                d'acteurs engagés pour un tourisme durable. Randonnées pédestres, fermes pédagogiques, 
                châteaux historiques et sites naturels préservés : découvrez nos coups de cœur pour 
                enrichir votre séjour.
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 border-b border-border sticky top-16 bg-background/95 backdrop-blur-sm z-40">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center gap-2"
                  >
                    <IconComponent className="h-4 w-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Trees className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                  Articles en préparation
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Nos premiers articles sur l'éco-tourisme breton arrivent bientôt. 
                  Revenez nous voir prochainement !
                </p>
                <Dialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      Suggérer un lieu
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Proposer un lieu
                      </DialogTitle>
                      <DialogDescription>
                        Partagez vos découvertes éco-touristiques en Bretagne !
                      </DialogDescription>
                    </DialogHeader>
                    <SuggestionForm onSuccess={() => setSuggestionDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Vous connaissez un lieu à découvrir ?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Partagez vos bonnes adresses ! Fermes, sentiers, sites culturels... 
              Nous adorons mettre en lumière les acteurs de l'éco-tourisme breton.
            </p>
            <Dialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  Proposer un lieu
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Proposer un lieu
                  </DialogTitle>
                  <DialogDescription>
                    Partagez vos découvertes éco-touristiques en Bretagne !
                  </DialogDescription>
                </DialogHeader>
                <SuggestionForm onSuccess={() => setSuggestionDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </section>
      </Layout>
    </>
  );
};

export default EcoSysteme;
