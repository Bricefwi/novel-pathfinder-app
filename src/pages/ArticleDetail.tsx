import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { Separator } from "@/components/ui/separator";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

/**
 * Renders article content with proper typography:
 * - Splits on double newlines into paragraphs
 * - Handles [IMAGE_1], [IMAGE_2], [IMAGE_3] markers with gallery images
 * - Detects "L'esprit Éco-Système" section for special styling
 * - Detects "Infos pratiques" section for card styling
 */
const ArticleContent = ({ content, images }: { content: string; images?: string[] }) => {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-7">
      {paragraphs.map((paragraph, idx) => {
        // Check for image markers
        const imageMatch = paragraph.match(/\[IMAGE_(\d)\]/);
        if (imageMatch) {
          const imgIdx = parseInt(imageMatch[1]) - 1;
          const imgUrl = images?.[imgIdx];
          const textBefore = paragraph.replace(/\[IMAGE_\d\]/, "").trim();

          return (
            <div key={idx}>
              {textBefore && (
                <p className="text-foreground/90 leading-[1.9] text-lg tracking-wide text-justify" lang="fr" style={{ hyphens: "auto" }}>
                  {textBefore}
                </p>
              )}
              {imgUrl && (
                <figure className="my-10 -mx-4 md:-mx-8 lg:-mx-16">
                  <img
                    src={imgUrl}
                    alt={`Illustration ${imageMatch[1]}`}
                    className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
                    loading="lazy"
                  />
                </figure>
              )}
            </div>
          );
        }

        // "L'esprit Éco-Système" callout block
        if (
          paragraph.toLowerCase().startsWith("l'esprit éco-système") ||
          paragraph.toLowerCase().startsWith("l'esprit eco-système") ||
          paragraph.toLowerCase().startsWith("l'esprit éco-systeme") ||
          paragraph.toLowerCase().startsWith("l'esprit eco-systeme")
        ) {
          return (
            <aside
              key={idx}
              className="my-10 p-6 md:p-8 bg-primary/5 border-l-4 border-primary rounded-r-lg"
            >
              <h3 className="font-serif text-xl font-semibold text-primary mb-3">
                🌿 L'esprit Éco-Système
              </h3>
              <p className="text-foreground/85 leading-[1.9] text-base md:text-[1.05rem] tracking-wide" lang="fr" style={{ hyphens: "auto" }}>
                {paragraph.replace(/^l'esprit éco-syst[eè]me\s*[:\-–—]?\s*/i, "")}
              </p>
            </aside>
          );
        }

        // Detect "Infos pratiques" section
        if (
          paragraph.toLowerCase().includes("infos pratiques") &&
          paragraph.toLowerCase().indexOf("infos pratiques") < 30
        ) {
          return (
            <aside
              key={idx}
              className="my-10 p-6 md:p-8 bg-muted/50 border border-border rounded-lg"
            >
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                📍 Infos pratiques
              </h3>
              <p className="text-foreground/80 leading-[1.8] text-base tracking-wide" lang="fr" style={{ hyphens: "auto" }}>
                {paragraph.replace(/^infos?\s*pratiques?\s*[:\-–—]?\s*/i, "")}
              </p>
            </aside>
          );
        }

        // First paragraph = lead / drop cap style
        if (idx === 0) {
          return (
            <p
              key={idx}
              className="text-foreground/90 text-xl md:text-[1.3rem] leading-[1.85] font-light tracking-wide first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1 text-justify"
              lang="fr"
              style={{ hyphens: "auto" }}
            >
              {paragraph}
            </p>
          );
        }

        // Regular paragraph
        return (
          <p
            key={idx}
            className="text-foreground/85 leading-[1.9] text-lg md:text-[1.1rem] tracking-wide text-justify"
            lang="fr"
            style={{ hyphens: "auto" }}
          >
            {paragraph}
          </p>
        );
      })}
    </div>
  );
};

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const readingTime = article?.content
    ? Math.max(1, Math.round(article.content.split(/\s+/).length / 200))
    : null;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !article) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="font-serif text-3xl font-bold text-foreground">Article introuvable</h1>
          <Link to="/carnet-de-voyage">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au Carnet de Voyage
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const heroImage = article.featured_image || cavaliersPlageCoucherSoleil;
  const galleryImages = Array.isArray(article.images) ? (article.images as string[]) : [];

  return (
    <Layout>
      <SEOHead
        title={`${article.title} | Carnet de Voyage - An Arwen`}
        description={article.excerpt || `Découvrez "${article.title}" sur le carnet de voyage de la Ferme Équestre An Arwen.`}
      />

      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] md:h-[60vh] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 pb-10 md:pb-14">
          <Link
            to="/carnet-de-voyage"
            className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Carnet
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-primary-foreground/70 text-sm mb-5">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(article.published_at || article.created_at)}
            </span>
            {article.category && (
              <span className="flex items-center gap-1.5 bg-primary-foreground/10 backdrop-blur-sm px-3 py-1 rounded-full">
                <Tag className="h-3.5 w-3.5" />
                {article.category}
              </span>
            )}
            {readingTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {readingTime} min de lecture
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-primary-foreground leading-tight max-w-4xl">
            {article.title}
          </h1>
        </div>
      </section>

      {/* Article body */}
      <article className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-[720px]">
          {article.excerpt && (
            <blockquote className="relative text-lg md:text-xl text-muted-foreground italic leading-relaxed border-l-4 border-primary/60 pl-6 md:pl-8 mb-12 md:mb-16">
              {article.excerpt}
            </blockquote>
          )}

          <Separator className="mb-10 md:mb-14" />

          {article.content ? (
            <ArticleContent content={article.content} images={galleryImages} />
          ) : (
            <p className="text-muted-foreground text-center py-12">
              Contenu à venir...
            </p>
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="mt-14 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-full transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-14 text-center">
            <Link to="/carnet-de-voyage">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tous les articles
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default ArticleDetail;
