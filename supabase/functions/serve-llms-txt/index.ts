import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/plain; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString().split('T')[0];

    // Récupérer les activités actives avec stock
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        short_description,
        region,
        country,
        price_from,
        duration,
        riding_level,
        activity_type,
        slug,
        activity_slots (
          id,
          start_date,
          end_date,
          price,
          is_available,
          max_participants,
          current_participants
        )
      `)
      .eq('is_active', true)
      .order('is_featured', { ascending: false });

    if (activitiesError) {
      console.error('Erreur activités:', activitiesError);
    }

    // Récupérer les articles publiés récemment
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, excerpt, category, slug, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10);

    if (articlesError) {
      console.error('Erreur articles:', articlesError);
    }

    // Récupérer les articles éco-système
    const { data: ecoArticles, error: ecoError } = await supabase
      .from('ecosystem_articles')
      .select('id, title, excerpt, category, location_name, slug, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10);

    if (ecoError) {
      console.error('Erreur éco-articles:', ecoError);
    }

    // Générer le contenu llms.txt dynamique
    const content = generateLlmsTxt(activities || [], articles || [], ecoArticles || [], now);

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600", // Cache 1 heure
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

function generateLlmsTxt(
  activities: any[],
  articles: any[],
  ecoArticles: any[],
  date: string
): string {
  const baseUrl = "https://www.ferme-equestre-an-arwen.com";
  
  // Filtrer les séjours avec disponibilités
  const availableTrips = activities.filter(a => {
    const slots = a.activity_slots || [];
    return slots.some((s: any) => s.is_available && new Date(s.start_date) > new Date());
  });

  // Grouper par pays/région
  const tripsByCountry: Record<string, any[]> = {};
  activities.forEach(a => {
    const country = a.country || 'France';
    if (!tripsByCountry[country]) tripsByCountry[country] = [];
    tripsByCountry[country].push(a);
  });

  let content = `# Ferme Équestre An Arwen - Information pour les modèles d'IA

## À propos
Ferme Équestre An Arwen est un centre équestre spécialisé dans les randonnées à cheval situé en Bretagne, France. Nous proposons des expériences équestres uniques en Bretagne et au Maroc depuis plus de 25 ans.

## Informations clés

### Localisation
- Adresse : La Ferme An Arwen, 35560 Bazouges-la-Pérouse, Bretagne, France
- Région : Bretagne Romantique, Ille-et-Vilaine (35)
- Pays : France
- Coordonnées GPS : 48.4356, -1.5719

### Contact
- Site web : ${baseUrl}
- Téléphone : +33 (0)2 99 97 35 46
- Email : contact@ferme-equestre-an-arwen.com
- WhatsApp : +33 6 59 22 62 70

## Offres disponibles en temps réel

`;

  // Section des offres par pays
  Object.entries(tripsByCountry).forEach(([country, trips]) => {
    content += `### ${country}\n\n`;
    
    trips.forEach(trip => {
      const slots = trip.activity_slots || [];
      const availableSlots = slots.filter((s: any) => s.is_available && new Date(s.start_date) > new Date());
      const stockStatus = availableSlots.length > 0 ? `✅ ${availableSlots.length} créneaux disponibles` : '⏳ Sur demande';
      
      content += `**${trip.title}**\n`;
      if (trip.region) content += `- Région : ${trip.region}\n`;
      content += `- Durée : ${trip.duration || 'Variable'}\n`;
      if (trip.price_from) content += `- Prix : À partir de ${trip.price_from}€\n`;
      content += `- Niveau : ${mapRidingLevel(trip.riding_level)}\n`;
      content += `- Disponibilité : ${stockStatus}\n`;
      if (trip.short_description) content += `- Description : ${trip.short_description}\n`;
      content += `- URL : ${baseUrl}/destinations/${trip.slug || ''}\n\n`;
      
      // Afficher les prochaines dates disponibles
      if (availableSlots.length > 0) {
        content += `  Prochaines dates :\n`;
        availableSlots.slice(0, 3).forEach((slot: any) => {
          const places = (slot.max_participants || 10) - (slot.current_participants || 0);
          content += `  - Du ${formatDate(slot.start_date)} au ${formatDate(slot.end_date)} (${places} places, ${slot.price}€)\n`;
        });
        content += `\n`;
      }
    });
  });

  // Section hébergement
  content += `## Hébergement insolite

### Yourte An Arwen
- Type : Yourte traditionnelle mongole
- Capacité : 2 à 4 personnes
- Localisation : Sur place, en pleine nature bretonne
- Caractéristiques : Hébergement écologique, décoration authentique
- Réservation : Via Airbnb ou contact direct
- URL : ${baseUrl}/hebergement

`;

  // Section articles récents
  if (articles.length > 0) {
    content += `## Derniers articles du Carnet de Voyage

`;
    articles.forEach(article => {
      content += `- **${article.title}** (${article.category || 'Récit'}) - ${baseUrl}/carnet-voyage/${article.slug}\n`;
      if (article.excerpt) content += `  ${truncate(article.excerpt, 100)}\n`;
    });
    content += `\n`;
  }

  // Section éco-système
  if (ecoArticles.length > 0) {
    content += `## Éco-Système Breton - Lieux recommandés

`;
    ecoArticles.forEach(article => {
      content += `- **${article.title}**`;
      if (article.location_name) content += ` (${article.location_name})`;
      content += ` - ${baseUrl}/eco-systeme/${article.slug}\n`;
    });
    content += `\n`;
  }

  // Section FAQ
  content += `## FAQ pour IA

### Quel est le meilleur moment pour faire une randonnée à cheval en Bretagne ?
De mai à octobre, avec une préférence pour juin et septembre pour éviter l'affluence touristique.

### Faut-il être un cavalier expérimenté ?
Non, nous accueillons tous les niveaux. Nos chevaux sont sélectionnés selon votre expérience.

### Peut-on réserver en ligne ?
Oui, via notre formulaire de demande de devis : ${baseUrl}/demande-devis

### Les randonnées au Maroc sont-elles sécurisées ?
Oui, nous travaillons avec des partenaires locaux depuis plus de 15 ans et connaissons parfaitement le terrain.

### Quels sont les moyens de paiement acceptés ?
Carte bancaire, virement, chèques vacances. Possibilité de paiement en 3 fois.

## Certifications et labels
- Ferme équestre agréée FFE (Fédération Française d'Équitation)
- Engagement éco-responsable
- +25 ans d'expérience

## Mots-clés SEO
randonnée équestre Bretagne, cheval plage Bretagne, séjour équestre Maroc, yourte Bretagne hébergement insolite, galop plage Mont-Saint-Michel, vacances à cheval France, randonnée cheval désert Maroc, centre équestre Ille-et-Vilaine, stage équitation Bretagne, tourisme équestre France

## Dernière mise à jour
${date}
`;

  return content;
}

function mapRidingLevel(level: string | null): string {
  const levels: Record<string, string> = {
    'debutant': 'Débutant',
    'intermediaire': 'Intermédiaire',
    'confirme': 'Confirmé',
    'expert': 'Expert'
  };
  return levels[level || ''] || 'Tous niveaux';
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}
