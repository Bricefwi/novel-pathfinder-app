import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

/**
 * Magazine-style article content renderer.
 * - Drop cap on first paragraph
 * - Multi-column layout for long paragraphs
 * - Pull quotes, image inserts, special blocks
 * - Generous whitespace and justified text with hyphens
 */
const ArticleContent = ({ content, images }: { content: string; images?: string[] }) => {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Group paragraphs into sections separated by images or special blocks
  const rendered: React.ReactNode[] = [];

  paragraphs.forEach((paragraph, idx) => {
    // Image markers
    const imageMatch = paragraph.match(/\[IMAGE_(\d)\]/);
    if (imageMatch) {
      const imgIdx = parseInt(imageMatch[1]) - 1;
      const imgUrl = images?.[imgIdx];
      const textBefore = paragraph.replace(/\[IMAGE_\d\]/, "").trim();

      if (textBefore) {
        rendered.push(
          <p key={`t-${idx}`} className="text-foreground/85 leading-[2] text-[1.05rem] md:text-lg tracking-wide text-justify mb-8" lang="fr" style={{ hyphens: "auto" }}>
            {textBefore}
          </p>
        );
      }
      if (imgUrl) {
        rendered.push(
          <figure key={`img-${idx}`} className="my-12 md:my-16 -mx-4 md:-mx-12 lg:-mx-20">
            <img
              src={imgUrl}
              alt={`Illustration ${imageMatch[1]}`}
              className="w-full h-64 md:h-80 lg:h-[420px] object-cover rounded-xl shadow-xl"
              loading="lazy"
            />
          </figure>
        );
      }
      return;
    }

    // "L'esprit Éco-Système" callout
    if (/^l'esprit [eé]co-syst[eè]me/i.test(paragraph)) {
      rendered.push(
        <aside key={idx} className="my-12 md:my-16 p-8 md:p-10 bg-primary/5 border-l-4 border-primary rounded-r-xl">
          <h3 className="font-serif text-xl md:text-2xl font-semibold text-primary mb-4">
            🌿 L'esprit Éco-Système
          </h3>
          <p className="text-foreground/80 leading-[1.9] text-base md:text-[1.05rem]" lang="fr" style={{ hyphens: "auto" }}>
            {paragraph.replace(/^l'esprit [eé]co-syst[eè]me\s*[:\-–—]?\s*/i, "")}
          </p>
        </aside>
      );
      return;
    }

    // "Infos pratiques" section
    if (/^infos?\s*pratiques?/i.test(paragraph.substring(0, 30))) {
      rendered.push(
        <aside key={idx} className="my-12 md:my-16 p-8 md:p-10 bg-muted/30 border border-border rounded-xl">
          <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-4">
            📍 Infos pratiques
          </h3>
          <p className="text-foreground/75 leading-[1.9] text-base" lang="fr" style={{ hyphens: "auto" }}>
            {paragraph.replace(/^infos?\s*pratiques?\s*[:\-–—]?\s*/i, "")}
          </p>
        </aside>
      );
      return;
    }

    // First paragraph — drop cap + larger text
    if (idx === 0) {
      rendered.push(
        <p
          key={idx}
          className="text-foreground/90 text-lg md:text-xl leading-[2] font-light tracking-wide first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:leading-[0.8] text-justify mb-10"
          lang="fr"
          style={{ hyphens: "auto" }}
        >
          {paragraph}
        </p>
      );
      return;
    }

    // Every 4th paragraph: pull quote style with decorative border (for visual break)
    if (idx > 0 && idx % 5 === 0 && paragraph.length > 80) {
      rendered.push(
        <div key={idx} className="my-12 md:my-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 flex items-center">
            <blockquote className="font-serif text-xl md:text-2xl text-primary/80 italic leading-relaxed border-l-4 border-primary/40 pl-6">
              {paragraph.split('.').slice(0, 2).join('.') + '.'}
            </blockquote>
          </div>
          <div className="md:col-span-8">
            <p className="text-foreground/85 leading-[2] text-[1.05rem] md:text-lg tracking-wide text-justify" lang="fr" style={{ hyphens: "auto" }}>
              {paragraph}
            </p>
          </div>
        </div>
      );
      return;
    }

    // Regular paragraph
    rendered.push(
      <p
        key={idx}
        className="text-foreground/85 leading-[2] text-[1.05rem] md:text-lg tracking-wide text-justify mb-8"
        lang="fr"
        style={{ hyphens: "auto" }}
      >
        {paragraph}
      </p>
    );
  });

  return <div>{rendered}</div>;
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
      <article className="py-14 md:py-24 bg-background">
        <div className="container mx-auto px-6 md:px-8 max-w-4xl">
          {/* Excerpt / Chapô */}
          {article.excerpt && (
            <blockquote className="relative text-lg md:text-xl text-muted-foreground italic leading-[1.9] border-l-4 border-primary/50 pl-6 md:pl-8 mb-14 md:mb-20">
              {article.excerpt}
            </blockquote>
          )}

          {/* Decorative separator */}
          <div className="flex items-center gap-4 mb-14 md:mb-20">
            <div className="flex-1 h-px bg-border" />
            <span className="text-primary text-2xl font-serif">✦</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Content */}
          {article.content ? (
            <ArticleContent content={article.content} images={galleryImages} />
          ) : (
            <p className="text-muted-foreground text-center py-12">
              Contenu à venir...
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-20 pt-10 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-muted/50 text-muted-foreground text-sm rounded-full transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back button */}
          <div className="mt-16 text-center">
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
