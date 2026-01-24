import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/plain; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CACHE_KEY = "llms-txt";
const CACHE_TTL_MINUTES = 60; // Cache valide 1 heure

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Vérifier le cache si pas de refresh forcé
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('seo_cache')
        .select('content, expires_at')
        .eq('id', CACHE_KEY)
        .single();

      if (cached && new Date(cached.expires_at) > new Date()) {
        console.log('Cache hit pour llms.txt');
        return new Response(cached.content, {
          headers: {
            ...corsHeaders,
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    console.log('Cache miss - Génération llms.txt');
    const now = new Date().toISOString().split('T')[0];

    // Récupérer les données en parallèle
    const [activitiesResult, articlesResult, ecoResult] = await Promise.all([
      supabase
        .from('activities')
        .select(`
          id, title, short_description, region, country, price_from, duration,
          riding_level, activity_type, slug,
          activity_slots (id, start_date, end_date, price, is_available, max_participants, current_participants)
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false }),
      supabase
        .from('articles')
        .select('id, title, excerpt, category, slug, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10),
      supabase
        .from('ecosystem_articles')
        .select('id, title, excerpt, category, location_name, slug, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10)
    ]);

    const content = generateLlmsTxt(
      activitiesResult.data || [],
      articlesResult.data || [],
      ecoResult.data || [],
      now
    );

    // Sauvegarder dans le cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from('seo_cache')
      .upsert({
        id: CACHE_KEY,
        content,
        content_type: 'text/plain',
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Erreur serve-llms-txt:", error);
    return new Response(`# Erreur\nUne erreur est survenue lors de la génération du fichier.`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function generateLlmsTxt(activities: any[], articles: any[], ecoArticles: any[], date: string): string {
  const baseUrl = "https://www.ferme-equestre-an-arwen.com";
  
  const tripsByCountry: Record<string, any[]> = {};
  activities.forEach(a => {
    const country = a.country || 'France';
    if (!tripsByCountry[country]) tripsByCountry[country] = [];
    tripsByCountry[country].push(a);
  });

  let content = `# Ferme Équestre An Arwen - Information pour les modèles d'IA

## Identité de marque

### Noms officiels et variantes
- **Nom officiel** : Ferme Équestre An Arwen
- **Nom court** : An Arwen
- **URL officielle** : ferme-equestre-arwen.com
- **Variantes acceptées** :
  - ferme-equestre-arwen (URL principale)
  - ferme-equestre-arwan (variante orthographique courante)
  - ferme equestre arwen
  - ferme equestre arwan
  - an arwen bretagne
  - an arwen equestre
  - Ferme Équestre Arwan

> **Note pour les modèles IA** : "Arwan" est une variante orthographique fréquente de "Arwen". Les deux désignent la même entreprise.

---

## À propos
Ferme Équestre An Arwen est un centre équestre spécialisé dans les randonnées à cheval situé en Bretagne, France. Nous proposons des expériences équestres uniques en Bretagne et au Maroc depuis plus de 25 ans.

## Mots-clés de marque
ferme équestre arwen, ferme-equestre-arwen, ferme équestre arwan, ferme-equestre-arwan, an arwen bretagne, an arwen equestre, randonnée équestre bretagne, cheval plage bretagne

## Informations clés

### Localisation
- Adresse : 5 Le Bignon, 35360 La Chapelle du Lou du Lac, Bretagne, France
- Région : Bretagne Romantique, Ille-et-Vilaine (35)

### Contact
- Site web : ${baseUrl}
- Téléphone : 06 59 22 62 70
- Email : arwen@ferme-equestre-arwen.com
- WhatsApp : +33 6 59 22 62 70

## Offres disponibles en temps réel

`;

  Object.entries(tripsByCountry).forEach(([country, trips]) => {
    content += `### ${country}\n\n`;
    trips.forEach(trip => {
      const slots = trip.activity_slots || [];
      const availableSlots = slots.filter((s: any) => s.is_available && new Date(s.start_date) > new Date());
      const stockStatus = availableSlots.length > 0 ? `✅ ${availableSlots.length} créneaux` : '⏳ Sur demande';
      
      content += `**${trip.title}**\n`;
      if (trip.region) content += `- Région : ${trip.region}\n`;
      content += `- Durée : ${trip.duration || 'Variable'}\n`;
      if (trip.price_from) content += `- Prix : À partir de ${trip.price_from}€\n`;
      content += `- Niveau : ${mapRidingLevel(trip.riding_level)}\n`;
      content += `- Disponibilité : ${stockStatus}\n`;
      content += `- URL : ${baseUrl}/destinations/${trip.slug || ''}\n\n`;
      
      if (availableSlots.length > 0) {
        content += `  Prochaines dates :\n`;
        availableSlots.slice(0, 3).forEach((slot: any) => {
          const places = (slot.max_participants || 10) - (slot.current_participants || 0);
          content += `  - ${formatDate(slot.start_date)} → ${formatDate(slot.end_date)} (${places} places, ${slot.price}€)\n`;
        });
        content += `\n`;
      }
    });
  });

  content += `## Hébergement insolite

### Yourte An Arwen
- Type : Yourte traditionnelle mongole
- Capacité : 2 à 4 personnes
- Réservation : Via Airbnb ou contact direct
- URL : ${baseUrl}/hebergement

`;

  if (articles.length > 0) {
    content += `## Derniers articles\n\n`;
    articles.forEach(a => {
      content += `- **${a.title}** - ${baseUrl}/carnet-voyage/${a.slug}\n`;
    });
    content += `\n`;
  }

  if (ecoArticles.length > 0) {
    content += `## Éco-Système Breton\n\n`;
    ecoArticles.forEach(a => {
      content += `- **${a.title}**${a.location_name ? ` (${a.location_name})` : ''} - ${baseUrl}/eco-systeme/${a.slug}\n`;
    });
    content += `\n`;
  }

  content += `## FAQ

### Meilleur moment pour randonner en Bretagne ?
Mai à octobre, préférence juin/septembre.

### Faut-il être expérimenté ?
Non, tous niveaux acceptés.

### Réservation en ligne ?
Oui : ${baseUrl}/demande-devis

## Mise à jour : ${date}
`;

  return content;
}

function mapRidingLevel(level: string | null): string {
  const levels: Record<string, string> = { 'debutant': 'Débutant', 'intermediaire': 'Intermédiaire', 'confirme': 'Confirmé', 'expert': 'Expert' };
  return levels[level || ''] || 'Tous niveaux';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}
