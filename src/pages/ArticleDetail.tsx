import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

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

  return (
    <Layout>
      <SEOHead
        title={`${article.title} | Carnet de Voyage - An Arwen`}
        description={article.excerpt || `Découvrez "${article.title}" sur le carnet de voyage de la Ferme Équestre An Arwen.`}
      />

      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 pb-12">
          <Link
            to="/carnet-de-voyage"
            className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Carnet
          </Link>
          <div className="flex items-center gap-4 text-primary-foreground/80 text-sm mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(article.published_at || article.created_at)}
            </span>
            {article.category && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {article.category}
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground">
            {article.title}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          {article.excerpt && (
            <p className="text-lg text-muted-foreground italic border-l-4 border-primary pl-6 mb-10">
              {article.excerpt}
            </p>
          )}

          {article.content ? (
            <div className="prose prose-lg max-w-none text-foreground leading-relaxed whitespace-pre-line">
              {article.content}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              Contenu à venir...
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link to="/carnet-de-voyage">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tous les articles
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ArticleDetail;
