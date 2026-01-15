import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const baseUrl = "https://www.ferme-equestre-an-arwen.com";

const CACHE_KEY = "sitemap-xml";
const CACHE_TTL_MINUTES = 60; // Cache valide 1 heure

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Vérifier le cache
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('seo_cache')
        .select('content, expires_at')
        .eq('id', CACHE_KEY)
        .single();

      if (cached && new Date(cached.expires_at) > new Date()) {
        console.log('Cache hit pour sitemap.xml');
        return new Response(cached.content, {
          headers: {
            ...corsHeaders,
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    console.log('Cache miss - Génération sitemap.xml');

    // Récupérer les données en parallèle
    const [activitiesResult, articlesResult, ecoResult] = await Promise.all([
      supabase.from('activities').select('slug, updated_at, is_featured').eq('is_active', true),
      supabase.from('articles').select('slug, updated_at').eq('is_published', true),
      supabase.from('ecosystem_articles').select('slug, updated_at').eq('is_published', true)
    ]);

    const sitemap = generateSitemap(
      activitiesResult.data || [],
      articlesResult.data || [],
      ecoResult.data || []
    );

    // Sauvegarder dans le cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from('seo_cache')
      .upsert({
        id: CACHE_KEY,
        content: sitemap,
        content_type: 'application/xml',
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=3600",
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

function generateSitemap(activities: any[], articles: any[], ecoArticles: any[]): string {
  const today = new Date().toISOString().split('T')[0];

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
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  staticRoutes.forEach(route => {
    xml += `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  activities.forEach(a => {
    if (!a.slug) return;
    const lastmod = a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : today;
    xml += `  <url>
    <loc>${baseUrl}/destinations/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${a.is_featured ? 0.85 : 0.7}</priority>
  </url>
`;
  });

  articles.forEach(a => {
    if (!a.slug) return;
    const lastmod = a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : today;
    xml += `  <url>
    <loc>${baseUrl}/carnet-de-voyage/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  ecoArticles.forEach(a => {
    if (!a.slug) return;
    const lastmod = a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : today;
    xml += `  <url>
    <loc>${baseUrl}/eco-systeme/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  xml += `</urlset>`;
  return xml;
}
