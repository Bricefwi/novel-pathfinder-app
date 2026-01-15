import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  ChevronLeft,
  Calendar,
  Eye,
  Share2,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";

interface EcosystemArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  images: string[] | null;
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
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  "randonnee": { icon: Mountain, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", label: "Randonnée" },
  "Randonnées": { icon: Mountain, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", label: "Randonnées" },
  "ferme-pedagogique": { icon: Leaf, color: "bg-amber-500/10 text-amber-700 border-amber-500/30", label: "Ferme Pédagogique" },
  "Fermes Pédagogiques": { icon: Leaf, color: "bg-amber-500/10 text-amber-700 border-amber-500/30", label: "Fermes Pédagogiques" },
  "patrimoine": { icon: Castle, color: "bg-rose-500/10 text-rose-700 border-rose-500/30", label: "Patrimoine" },
  "Patrimoine": { icon: Castle, color: "bg-rose-500/10 text-rose-700 border-rose-500/30", label: "Patrimoine & Culture" },
  "nature": { icon: Trees, color: "bg-teal-500/10 text-teal-700 border-teal-500/30", label: "Nature & Écologie" },
  "Nature": { icon: Trees, color: "bg-teal-500/10 text-teal-700 border-teal-500/30", label: "Nature & Écologie" },
  "decouverte": { icon: Compass, color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30", label: "Découverte" },
};

const EcoSystemeArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<EcosystemArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug);
    }
  }, [slug]);

  const fetchArticle = async (articleSlug: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ecosystem_articles")
      .select("*")
      .eq("slug", articleSlug)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      console.error("Error fetching article:", error);
      navigate("/eco-systeme");
      return;
    }

    setArticle(data);
    
    // Increment views
    await supabase
      .from("ecosystem_articles")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", data.id);
    
    setLoading(false);
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || "",
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Lien copié !",
        description: "Le lien de l'article a été copié dans le presse-papier.",
      });
    }
  };

  // Fonction pour insérer les images dans le contenu
  const renderContentWithImages = (content: string, images: string[] | null) => {
    if (!content) return null;
    
    const galleryImages = images || [];
    
    // Remplacer les marqueurs [IMAGE_X] par des images
    let processedContent = content;
    
    galleryImages.forEach((imageUrl, index) => {
      const marker = `[IMAGE_${index + 1}]`;
      const imageHtml = `
        <figure class="article-image my-8">
          <img 
            src="${imageUrl}" 
            alt="Illustration de l'article" 
            class="w-full rounded-xl shadow-lg"
            loading="lazy"
          />
        </figure>
      `;
      processedContent = processedContent.replace(marker, imageHtml);
    });
    
    // Nettoyer les marqueurs restants non remplacés
    processedContent = processedContent.replace(/\[IMAGE_\d+\]/g, '');
    
    // Convertir les retours à la ligne en HTML
    processedContent = processedContent
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
      .join('');
    
    return processedContent;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return null;
  }

  const config = categoryConfig[article.category || "decouverte"] || categoryConfig["decouverte"];
  const IconComponent = config.icon;
  const processedContent = renderContentWithImages(article.content || '', article.images);

  return (
    <>
      <SEOHead
        title={`${article.title} - Éco-Système`}
        description={article.excerpt || `Découvrez ${article.location_name} près de la Ferme Équestre An Arwen`}
        keywords={article.tags?.join(", ") || "éco-tourisme Bretagne"}
      />
      <Layout>
        <article className="pb-16">
          {/* Hero Image */}
          <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
            <img
              src={article.featured_image || bretagnVillageChevaux}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = bretagnVillageChevaux;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>

          <div className="container mx-auto px-4 -mt-32 relative z-10">
            {/* Back button */}
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="mb-6 bg-background/80 backdrop-blur-sm"
            >
              <Link to="/eco-systeme">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <CardContent className="p-8">
                    {/* Category & Meta */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <Badge className={`${config.color} border flex items-center gap-1.5`}>
                        <IconComponent className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      {article.distance_from_arwen && (
                        <Badge variant="secondary" className="flex items-center gap-1.5">
                          <Navigation className="h-3 w-3" />
                          {article.distance_from_arwen} d'An Arwen
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                      {article.title}
                    </h1>

                    {/* Location */}
                    {article.location_name && (
                      <p className="text-primary font-medium text-lg mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {article.location_name}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
                      {article.published_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(article.published_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                      {article.views_count !== null && (
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />
                          {article.views_count} vues
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleShare}
                        className="ml-auto"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Partager
                      </Button>
                    </div>

                    {/* Excerpt / Chapô */}
                    {article.excerpt && (
                      <p className="text-lg text-muted-foreground italic mb-8 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Content with embedded images */}
                    <div 
                      className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6 prose-a:text-primary prose-img:rounded-xl prose-img:shadow-lg prose-figure:my-8"
                      dangerouslySetInnerHTML={{ 
                        __html: processedContent || '' 
                      }}
                    />

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {article.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Contact Info */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">
                      Informations pratiques
                    </h3>

                    <div className="space-y-4">
                      {article.location_address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Adresse</p>
                            <p className="text-sm text-muted-foreground">{article.location_address}</p>
                          </div>
                        </div>
                      )}

                      {article.location_phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Téléphone</p>
                            <a 
                              href={`tel:${article.location_phone}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {article.location_phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {article.location_email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <a 
                              href={`mailto:${article.location_email}`}
                              className="text-sm text-primary hover:underline break-all"
                            >
                              {article.location_email}
                            </a>
                          </div>
                        </div>
                      )}

                      {article.location_website && (
                        <div className="flex items-start gap-3">
                          <Globe className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Site web</p>
                            <a 
                              href={article.location_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              Visiter le site
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {article.distance_from_arwen && (
                        <div className="flex items-start gap-3 pt-4 border-t border-border">
                          <Navigation className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Distance</p>
                            <p className="text-sm text-muted-foreground">
                              À {article.distance_from_arwen} de la Ferme An Arwen
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {article.location_website && (
                      <Button asChild className="w-full mt-6">
                        <a 
                          href={article.location_website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visiter le site officiel
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </article>
      </Layout>
    </>
  );
};

export default EcoSystemeArticle;
