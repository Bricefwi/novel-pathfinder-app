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
  MapPin, Phone, Mail, Globe, Navigation, Leaf, Mountain, Castle, Trees, Compass,
  ChevronLeft, Calendar, Eye, Share2, ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
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

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
};

type ContentBlock = 
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string; alt: string };

const parseContentToBlocks = (content: string, images: string[] | null): ContentBlock[] => {
  if (!content) return [];
  const galleryImages = images || [];
  const blocks: ContentBlock[] = [];

  let cleanContent = content
    .replace(/<img\s+[^>]*src="[^"]*"[^>]*\/?>/gi, '')
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/src="[^"]+"\s*\n?\s*alt="[^"]*"\s*\n?\s*class="[^"]*"\s*\n?\s*loading="[^"]*"\s*\n?\s*\/>/gi, '');

  const parts = cleanContent.split(/(\[IMAGE_\d+\])/g);

  parts.forEach((part) => {
    const trimmedPart = part.trim();
    if (!trimmedPart) return;

    const imageMatch = trimmedPart.match(/\[IMAGE_(\d+)\]/);
    if (imageMatch) {
      const imageIndex = parseInt(imageMatch[1], 10) - 1;
      if (galleryImages[imageIndex]) {
        blocks.push({ type: 'image', src: galleryImages[imageIndex], alt: `Illustration de l'article` });
      }
    } else {
      const paragraphs = trimmedPart.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
      paragraphs.forEach((para) => {
        blocks.push({ type: 'paragraph', text: para.replace(/\n/g, '<br />') });
      });
    }
  });

  return blocks;
};

/** Magazine-style content renderer with generous spacing and pull quotes */
const ContentRenderer = ({ content, images }: { content: string; images: string[] | null }) => {
  const blocks = parseContentToBlocks(content, images);

  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === 'image') {
          return (
            <figure key={index} className="my-12 md:my-16 -mx-4 md:-mx-8">
              <img 
                src={block.src} 
                alt={block.alt}
                className="w-full max-h-[420px] object-cover rounded-xl shadow-xl"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </figure>
          );
        }

        const sanitizedHtml = DOMPurify.sanitize(block.text, {
          ALLOWED_TAGS: ['br', 'strong', 'em', 'u', 'b', 'i'],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true
        });

        // First paragraph: drop cap
        if (index === 0) {
          return (
            <p 
              key={index} 
              className="text-foreground/90 text-lg md:text-xl leading-[2] font-light tracking-wide first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:leading-[0.8] text-justify mb-10"
              lang="fr"
              style={{ hyphens: "auto" }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }

        // Every 5th text block: pull quote layout
        const textBlockIndex = blocks.slice(0, index).filter(b => b.type === 'paragraph').length;
        if (textBlockIndex > 0 && textBlockIndex % 4 === 0 && block.text.length > 100) {
          const plainText = block.text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
          const pullQuote = plainText.split('.').slice(0, 2).join('.') + '.';
          return (
            <div key={index} className="my-12 md:my-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4">
                <blockquote className="font-serif text-xl md:text-2xl text-primary/80 italic leading-relaxed border-l-4 border-primary/40 pl-6">
                  {pullQuote}
                </blockquote>
              </div>
              <div className="md:col-span-8">
                <p 
                  className="text-foreground/85 leading-[2] text-[1.05rem] md:text-lg tracking-wide text-justify"
                  lang="fr"
                  style={{ hyphens: "auto" }}
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              </div>
            </div>
          );
        }

        return (
          <p 
            key={index} 
            className="text-foreground/85 leading-[2] text-[1.05rem] md:text-lg tracking-wide text-justify mb-8"
            lang="fr"
            style={{ hyphens: "auto" }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      })}
    </div>
  );
};

const EcoSystemeArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<EcosystemArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchArticle(slug);
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
    await supabase
      .from("ecosystem_articles")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", data.id);
    setLoading(false);
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({ title: article.title, text: article.excerpt || "", url: window.location.href });
      } catch (err) { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Lien copié !", description: "Le lien de l'article a été copié dans le presse-papier." });
    }
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

  if (!article) return null;

  const config = categoryConfig[article.category || "decouverte"] || categoryConfig["decouverte"];
  const IconComponent = config.icon;
  const displayFeaturedImage = (article as any).featured_image_override || article.featured_image;
  const displayGalleryImages = (article as any).images_override?.length > 0 
    ? (article as any).images_override 
    : article.images;

  return (
    <>
      <SEOHead
        title={`${article.title} - Éco-Système`}
        description={article.excerpt || `Découvrez ${article.location_name} près de la Ferme Équestre An Arwen`}
        keywords={article.tags?.join(", ") || "éco-tourisme Bretagne"}
      />
      <Layout>
        <article className="pb-16">
          {/* Hero banner */}
          <div className="relative h-[45vh] min-h-[320px] max-h-[450px] overflow-hidden">
            <img
              src={displayFeaturedImage || bretagnVillageChevaux}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = bretagnVillageChevaux; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>

          <div className="container mx-auto px-4 -mt-32 relative z-10">
            {/* Back button */}
            <Button variant="outline" size="sm" asChild className="mb-6 bg-background/80 backdrop-blur-sm">
              <Link to="/eco-systeme">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <CardContent className="p-8 md:p-12">
                    {/* Category & Meta */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
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
                    <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-foreground mb-5 leading-tight">
                      {article.title}
                    </h1>

                    {/* Location */}
                    {article.location_name && (
                      <p className="text-primary font-medium text-lg mb-5 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {article.location_name}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-10 pb-8 border-b border-border">
                      {article.published_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(article.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {article.views_count !== null && (
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />
                          {article.views_count} vues
                        </span>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto">
                        <Share2 className="h-4 w-4 mr-1" />
                        Partager
                      </Button>
                    </div>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <blockquote className="text-lg md:text-xl text-muted-foreground italic leading-[1.9] border-l-4 border-primary/50 pl-6 md:pl-8 mb-12 md:mb-16">
                        {article.excerpt}
                      </blockquote>
                    )}

                    {/* Decorative separator */}
                    <div className="flex items-center gap-4 mb-12 md:mb-16">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-primary text-2xl font-serif">✦</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Content */}
                    <ContentRenderer content={article.content || ''} images={displayGalleryImages} />

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="mt-16 pt-10 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {article.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
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
                            <a href={`tel:${article.location_phone}`} className="text-sm text-primary hover:underline">{article.location_phone}</a>
                          </div>
                        </div>
                      )}
                      {article.location_email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <a href={`mailto:${article.location_email}`} className="text-sm text-primary hover:underline break-all">{article.location_email}</a>
                          </div>
                        </div>
                      )}
                      {article.location_website && (
                        <div className="flex items-start gap-3">
                          <Globe className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Site web</p>
                            <a href={normalizeUrl(article.location_website)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                              Visiter le site <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                      {article.distance_from_arwen && (
                        <div className="flex items-start gap-3 pt-4 border-t border-border">
                          <Navigation className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Distance</p>
                            <p className="text-sm text-muted-foreground">À {article.distance_from_arwen} de la Ferme An Arwen</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {article.location_website && (
                      <Button asChild className="w-full mt-6">
                        <a href={normalizeUrl(article.location_website)} target="_blank" rel="noopener noreferrer">
                          Visiter le site officiel <ExternalLink className="ml-2 h-4 w-4" />
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
