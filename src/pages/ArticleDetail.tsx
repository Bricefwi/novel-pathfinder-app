import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/seo/SEOHead";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

/**
 * Parse content into blocks: paragraphs, images, special sections.
 * Handles both single-newline and double-newline separated content.
 */
type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; index: number }
  | { type: "eco-spirit"; text: string }
  | { type: "infos"; text: string };

const parseContentToBlocks = (content: string, images?: string[]): ContentBlock[] => {
  if (!content) return [];
  const galleryImages = images || [];
  const blocks: ContentBlock[] = [];

  // Remove raw HTML img/figure tags
  let cleanContent = content
    .replace(/<img\s+[^>]*\/?>/gi, "")
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "");

  // Split on image markers first
  const parts = cleanContent.split(/(\[IMAGE_\d+\])/g);

  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    const imageMatch = trimmed.match(/\[IMAGE_(\d+)\]/);
    if (imageMatch) {
      const imgIdx = parseInt(imageMatch[1], 10) - 1;
      if (galleryImages[imgIdx]) {
        blocks.push({ type: "image", src: galleryImages[imgIdx], index: imgIdx });
      }
      return;
    }

    // Split into paragraphs — handle double newlines, single newlines with empty lines, 
    // or even long text with only single newlines (split on sentences if needed)
    let paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);

    // If we only got 1 big block, try splitting on single newlines
    if (paragraphs.length === 1 && paragraphs[0].length > 400) {
      paragraphs = paragraphs[0].split(/\n/).map((p) => p.trim()).filter((p) => p.length > 0);
    }

    // If still only 1 huge block, split into ~200-word chunks at sentence boundaries
    if (paragraphs.length === 1 && paragraphs[0].length > 800) {
      const text = paragraphs[0];
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const chunks: string[] = [];
      let current = "";
      for (const sentence of sentences) {
        if (current.length + sentence.length > 600 && current.length > 100) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
      paragraphs = chunks;
    }

    paragraphs.forEach((para) => {
      // Detect special sections
      if (/^l'esprit [eé]co-syst[eè]me/i.test(para)) {
        blocks.push({
          type: "eco-spirit",
          text: para.replace(/^l'esprit [eé]co-syst[eè]me\s*[:\-–—]?\s*/i, ""),
        });
        return;
      }
      if (/^infos?\s*pratiques?/i.test(para.substring(0, 30))) {
        blocks.push({
          type: "infos",
          text: para.replace(/^infos?\s*pratiques?\s*[:\-–—]?\s*/i, ""),
        });
        return;
      }
      blocks.push({ type: "paragraph", text: para.replace(/\n/g, "<br />") });
    });
  });

  return blocks;
};

/**
 * Magazine-style content renderer with generous spacing.
 */
const ArticleContent = ({ content, images }: { content: string; images?: string[] }) => {
  const blocks = parseContentToBlocks(content, images);

  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === "image") {
          return (
            <figure key={index} className="my-14 md:my-20 -mx-4 md:-mx-12 lg:-mx-20">
              <img
                src={block.src}
                alt={`Illustration ${block.index + 1}`}
                className="w-full h-64 md:h-80 lg:h-[420px] object-cover rounded-xl shadow-xl"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </figure>
          );
        }

        if (block.type === "eco-spirit") {
          return (
            <aside
              key={index}
              className="my-14 md:my-20 p-8 md:p-10 bg-primary/5 border-l-4 border-primary rounded-r-xl"
            >
              <h3 className="font-serif text-xl md:text-2xl font-semibold text-primary mb-4">
                🌿 L'esprit Éco-Système
              </h3>
              <p
                className="text-foreground/80 leading-[1.9] text-base md:text-[1.05rem]"
                lang="fr"
                style={{ hyphens: "auto" }}
              >
                {block.text}
              </p>
            </aside>
          );
        }

        if (block.type === "infos") {
          return (
            <aside
              key={index}
              className="my-14 md:my-20 p-8 md:p-10 bg-muted/30 border border-border rounded-xl"
            >
              <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-4">
                📍 Infos pratiques
              </h3>
              <p
                className="text-foreground/75 leading-[1.9] text-base"
                lang="fr"
                style={{ hyphens: "auto" }}
              >
                {block.text}
              </p>
            </aside>
          );
        }

        // Sanitize HTML
        const sanitizedHtml = DOMPurify.sanitize(block.text, {
          ALLOWED_TAGS: ["br", "strong", "em", "u", "b", "i"],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        });

        // First text paragraph: drop cap
        const textBlockIndex = blocks
          .slice(0, index)
          .filter((b) => b.type === "paragraph").length;

        if (textBlockIndex === 0) {
          return (
            <p
              key={index}
              className="text-foreground/90 text-lg md:text-xl leading-[2.2] font-light tracking-wide first-letter:text-7xl first-letter:font-serif first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:leading-[0.8] text-justify mb-12"
              lang="fr"
              style={{ hyphens: "auto" }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }

        // Every 4th text block: pull quote layout
        if (textBlockIndex > 0 && textBlockIndex % 4 === 0 && block.text.length > 100) {
          const plainText = block.text
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, "");
          const pullQuote =
            plainText.split(".").slice(0, 2).join(".") + ".";
          return (
            <div
              key={index}
              className="my-14 md:my-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
            >
              <div className="md:col-span-4">
                <blockquote className="font-serif text-xl md:text-2xl text-primary/80 italic leading-relaxed border-l-4 border-primary/40 pl-6">
                  {pullQuote}
                </blockquote>
              </div>
              <div className="md:col-span-8">
                <p
                  className="text-foreground/85 leading-[2.2] text-[1.05rem] md:text-lg tracking-wide text-justify"
                  lang="fr"
                  style={{ hyphens: "auto" }}
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p
            key={index}
            className="text-foreground/85 leading-[2.2] text-[1.05rem] md:text-lg tracking-wide text-justify mb-10"
            lang="fr"
            style={{ hyphens: "auto" }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      })}
    </div>
  );
};

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
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

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || "",
          url: window.location.href,
        });
      } catch {
        /* cancelled */
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié dans le presse-papier !");
    }
  };

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
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Article introuvable
          </h1>
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
  const galleryImages = Array.isArray(article.images)
    ? (article.images as string[])
    : [];

  return (
    <Layout>
      <SEOHead
        title={`${article.title} | Carnet de Voyage - An Arwen`}
        description={
          article.excerpt ||
          `Découvrez "${article.title}" sur le carnet de voyage de la Ferme Équestre An Arwen.`
        }
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
      <article className="py-16 md:py-28 bg-background">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          {/* Share button */}
          <div className="flex justify-end mb-8">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Partager
            </Button>
          </div>

          {/* Excerpt / Chapô */}
          {article.excerpt && (
            <blockquote className="relative text-lg md:text-xl text-muted-foreground italic leading-[1.9] border-l-4 border-primary/50 pl-6 md:pl-8 mb-16 md:mb-24">
              {article.excerpt}
            </blockquote>
          )}

          {/* Decorative separator */}
          <div className="flex items-center gap-4 mb-16 md:mb-24">
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
            <div className="mt-24 pt-10 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="px-4 py-2 text-sm"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Back button */}
          <div className="mt-20 text-center">
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
