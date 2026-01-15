import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const baseUrl = "https://www.ferme-equestre-an-arwen.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer toutes les activités actives
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('slug, updated_at, is_featured')
      .eq('is_active', true);

    if (activitiesError) {
      console.error('Erreur activités:', activitiesError);
    }

    // Récupérer tous les articles publiés
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (articlesError) {
      console.error('Erreur articles:', articlesError);
    }

    // Récupérer tous les articles éco-système
    const { data: ecoArticles, error: ecoError } = await supabase
      .from('ecosystem_articles')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (ecoError) {
      console.error('Erreur éco-articles:', ecoError);
    }

    // Générer le sitemap
    const sitemap = generateSitemap(
      activities || [],
      articles || [],
      ecoArticles || []
    );

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600", // Cache 1 heure
      },
    });
  } catch (error) {
    console.error("Erreur serve-sitemap-xml:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>Une erreur est survenue</error>`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function generateSitemap(
  activities: any[],
  articles: any[],
  ecoArticles: any[]
): string {
  const today = new Date().toISOString().split('T')[0];

  // Routes statiques avec leurs priorités
  const staticRoutes = [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/destinations', priority: 0.9, changefreq: 'weekly' },
    { url: '/planning', priority: 0.8, changefreq: 'weekly' },
    { url: '/hebergement', priority: 0.8, changefreq: 'monthly' },
    { url: '/carnet-de-voyage', priority: 0.7, changefreq: 'weekly' },
    { url: '/eco-systeme', priority: 0.7, changefreq: 'weekly' },
    { url: '/galerie', priority: 0.6, changefreq: 'monthly' },
    { url: '/contact', priority: 0.8, changefreq: 'monthly' },
    { url: '/demande-devis', priority: 0.9, changefreq: 'monthly' },
    { url: '/preparer-voyage', priority: 0.7, changefreq: 'monthly' },
    { url: '/agent-faq', priority: 0.5, changefreq: 'monthly' },
    { url: '/auth', priority: 0.3, changefreq: 'yearly' },
    { url: '/cgu', priority: 0.2, changefreq: 'yearly' },
    { url: '/cgv', priority: 0.2, changefreq: 'yearly' },
    { url: '/politique-confidentialite', priority: 0.2, changefreq: 'yearly' },
    { url: '/cookies', priority: 0.2, changefreq: 'yearly' },
    { url: '/mentions-legales', priority: 0.2, changefreq: 'yearly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Ajouter les routes statiques
  staticRoutes.forEach(route => {
    xml += `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="${baseUrl}${route.url}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${route.url}"/>
  </url>
`;
  });

  // Ajouter les activités dynamiques
  activities.forEach(activity => {
    if (!activity.slug) return;
    
    const lastmod = activity.updated_at 
      ? new Date(activity.updated_at).toISOString().split('T')[0] 
      : today;
    const priority = activity.is_featured ? 0.85 : 0.7;

    xml += `  <url>
    <loc>${baseUrl}/destinations/${activity.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>
`;
  });

  // Ajouter les articles du blog
  articles.forEach(article => {
    if (!article.slug) return;
    
    const lastmod = article.updated_at 
      ? new Date(article.updated_at).toISOString().split('T')[0] 
      : today;

    xml += `  <url>
    <loc>${baseUrl}/carnet-de-voyage/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  // Ajouter les articles éco-système
  ecoArticles.forEach(article => {
    if (!article.slug) return;
    
    const lastmod = article.updated_at 
      ? new Date(article.updated_at).toISOString().split('T')[0] 
      : today;

    xml += `  <url>
    <loc>${baseUrl}/eco-systeme/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  xml += `</urlset>`;

  return xml;
}
