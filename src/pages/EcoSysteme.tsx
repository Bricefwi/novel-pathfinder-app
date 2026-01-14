import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Navigation,
  Leaf,
  Mountain,
  Castle,
  Trees,
  Compass,
  ChevronRight,
  Calendar,
  Eye
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

const ArticleCard = ({ article }: { article: EcosystemArticle }) => {
  const config = categoryConfig[article.category || "decouverte"] || categoryConfig["decouverte"];
  const IconComponent = config.icon;
  
  return (
    <Card className="group overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={article.featured_image || bretagnVillageChevaux}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = bretagnVillageChevaux;
          }}
        />
        <div className="absolute top-4 left-4">
          <Badge className={`${config.color} border text-xs tracking-wider font-medium flex items-center gap-1.5`}>
            <IconComponent className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        {article.distance_from_arwen && (
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm flex items-center gap-1.5">
              <Navigation className="h-3 w-3" />
              {article.distance_from_arwen}
            </Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
      </div>
      
      <CardContent className="p-6">
        {/* Title */}
        <h3 className="font-serif text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {/* Location */}
        {article.location_name && (
          <p className="text-primary font-medium text-sm mb-2 flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {article.location_name}
          </p>
        )}
        
        {/* Excerpt */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
          {article.excerpt}
        </p>
        
        {/* Contact info preview */}
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
              href={article.location_website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="h-3 w-3" />
              Site web
            </a>
          )}
        </div>
        
        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Footer */}
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

const EcoSysteme = () => {
  const [articles, setArticles] = useState<EcosystemArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

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
                <Button asChild>
                  <Link to="/contact">
                    Suggérer un lieu
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
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
            <Button asChild size="lg">
              <Link to="/contact">
                Proposer un lieu
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </Layout>
    </>
  );
};

export default EcoSysteme;