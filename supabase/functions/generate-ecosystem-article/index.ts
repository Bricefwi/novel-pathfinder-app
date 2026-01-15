import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArticleData {
  title: string;
  excerpt: string;
  content: string;
  location_name: string;
  location_address: string;
  location_phone: string;
  location_email: string;
  location_website: string;
  distance_from_arwen: string;
  category: string;
  tags: string[];
  image_search_keywords: string[];
}

// Images spécifiques Bretagne et Brocéliande par catégorie (Unsplash URLs)
const categoryImages: Record<string, { featured: string[]; gallery: string[][] }> = {
  "Randonnées": {
    featured: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop&q=80", // Forêt de Brocéliande style
      "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1200&h=800&fit=crop&q=80", // Forêt brumeuse
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=800&fit=crop&q=80", // Forêt verte dense
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop&q=80", // Sentier forestier
    ],
    gallery: [
      [
        "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&h=600&fit=crop&q=80", // Lumière en forêt
        "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=800&h=600&fit=crop&q=80", // Forêt profonde
        "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&h=600&fit=crop&q=80", // Chemin arboré
      ],
      [
        "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&h=600&fit=crop&q=80", // Automne forêt
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&h=600&fit=crop&q=80", // Forêt brumeuse automne
        "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&h=600&fit=crop&q=80", // Forêt mystique
      ],
    ],
  },
  "Fermes Pédagogiques": {
    featured: [
      "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=800&fit=crop&q=80", // Animaux ferme
      "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=1200&h=800&fit=crop&q=80", // Chèvres
      "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=800&fit=crop&q=80", // Campagne
      "https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?w=1200&h=800&fit=crop&q=80", // Scène ferme
    ],
    gallery: [
      [
        "https://images.unsplash.com/photo-1574938730946-16a9c9ca4c77?w=800&h=600&fit=crop&q=80", // Poules
        "https://images.unsplash.com/photo-1602081115068-12e10f75fbc7?w=800&h=600&fit=crop&q=80", // Moutons
        "https://images.unsplash.com/photo-1559628129-67cf63b72248?w=800&h=600&fit=crop&q=80", // Âne
      ],
      [
        "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&h=600&fit=crop&q=80", // Vaches
        "https://images.unsplash.com/photo-1625596275461-46c6f8d01bea?w=800&h=600&fit=crop&q=80", // Porcelets
        "https://images.unsplash.com/photo-1589923188651-268a9765e432?w=800&h=600&fit=crop&q=80", // Enfant ferme
      ],
    ],
  },
  "Patrimoine": {
    featured: [
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&h=800&fit=crop&q=80", // Château médiéval France
      "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=1200&h=800&fit=crop&q=80", // Murailles médiévales
      "https://images.unsplash.com/photo-1524397057410-a44a7c4e82c6?w=1200&h=800&fit=crop&q=80", // Abbaye
      "https://images.unsplash.com/photo-1565876427310-0695a4ff03b7?w=1200&h=800&fit=crop&q=80", // Chapelle
    ],
    gallery: [
      [
        "https://images.unsplash.com/photo-1541417904950-b855846fe074?w=800&h=600&fit=crop&q=80", // Tour médiévale
        "https://images.unsplash.com/photo-1598755257130-c2aaca1f061c?w=800&h=600&fit=crop&q=80", // Patrimoine
        "https://images.unsplash.com/photo-1560930950-5cc20e80e392?w=800&h=600&fit=crop&q=80", // Architecture historique
      ],
      [
        "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&h=600&fit=crop&q=80", // Château français
        "https://images.unsplash.com/photo-1564429238535-2a9ca65eb5c2?w=800&h=600&fit=crop&q=80", // Médiéval
        "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop&q=80", // Château
      ],
    ],
  },
  "Nature": {
    featured: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop&q=80", // Rivière nature
      "https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=1200&h=800&fit=crop&q=80", // Lac calme
      "https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=1200&h=800&fit=crop&q=80", // Vallée verte
      "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&h=800&fit=crop&q=80", // Prairie
    ],
    gallery: [
      [
        "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&h=600&fit=crop&q=80", // Étang
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80", // Nature lac
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop&q=80", // Prairie verte
      ],
      [
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop&q=80", // Paysage naturel
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&q=80", // Collines
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop&q=80", // Nature sauvage
      ],
    ],
  },
};

// Sélectionner des images aléatoires pour une catégorie
function getRandomImages(category: string): { featured: string; gallery: string[] } {
  const images = categoryImages[category] || categoryImages["Nature"];
  const featuredIndex = Math.floor(Math.random() * images.featured.length);
  const galleryIndex = Math.floor(Math.random() * images.gallery.length);
  
  return {
    featured: images.featured[featuredIndex],
    gallery: images.gallery[galleryIndex],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, category } = await req.json();

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Prompt maître premium style magazine Géo
    const prompt = `Tu es un rédacteur-reporter premium spécialisé en éco-tourisme, nature, patrimoine et tourisme responsable en Bretagne.
Ta mission est de rédiger un article de type magazine Géo, en français, pour une rubrique appelée "Eco-Système", liée à la Ferme Équestre An Arwen (5 Le Bignon, 35360 La Chapelle du Lou du Lac, Bretagne).

SUJET DE L'ARTICLE : "${topic}" dans la catégorie "${category}"

PÉRIMÈTRE GÉOGRAPHIQUE :
- Centre : Ferme Équestre An Arwen, 5 Le Bignon, 35360 La Chapelle du Lou du Lac
- Cercle 1 (0-15 km) : sites très proches
- Cercle 2 (15-50 km) : Brocéliande, Ille-et-Vilaine
- Cercle 3 : Bretagne entière (escapades d'une journée depuis An Arwen)

CONSIGNES DE RÉDACTION IMPÉRATIVES :
1. AUCUN caractère markdown : pas de **, ##, #, [1], *** ou autre formatage technique
2. Rédige en texte fluide et naturel, comme un vrai journaliste de magazine
3. Utilise des paragraphes aérés avec des retours à la ligne simples
4. Le texte doit sembler écrit par un humain passionné, pas par une IA
5. Style narratif, contemplatif, sensoriel, jamais publicitaire
6. Intègre des touches de culture locale : légendes, histoire, patrimoine

STRUCTURE DE L'ARTICLE :

Le contenu doit inclure des marqueurs [IMAGE_1], [IMAGE_2], [IMAGE_3] à des endroits stratégiques dans le texte (après 2-3 paragraphes) pour indiquer où les photos d'illustration doivent être insérées.

TITRE : Un titre évocateur et poétique (sans ponctuation spéciale, sans deux-points)

CHAPÔ (3-4 phrases) : Introduction sensorielle et immersive avec lumière, odeurs, sons, saison. Situe le lieu par rapport à la Ferme An Arwen.

CORPS DE L'ARTICLE (1000-1500 mots) :
Écris en paragraphes fluides séparés par des doubles retours à la ligne.
- Descriptions détaillées des paysages, faune et flore
- Mise en scène d'itinéraires ou activités concrètes
- Engagements éco-touristiques du lieu
- Suggestions de combinaisons avec un séjour à An Arwen

Insère [IMAGE_1] après les premiers paragraphes d'introduction.
Insère [IMAGE_2] au milieu de l'article, dans une section descriptive.
Insère [IMAGE_3] avant la conclusion ou les infos pratiques.

À la fin du corps de l'article, inclure naturellement :

INFOS PRATIQUES (intégrées dans un paragraphe fluide, pas de liste à puces) :
Nom complet et type de structure, adresse postale complète, téléphone, email, site web officiels (VÉRIFIE que ces coordonnées sont réelles), horaires et saisonnalité, distance et temps de trajet depuis An Arwen, conseils pratiques (équipement, niveau de difficulté).

ENCADRÉ "L'ESPRIT ECO-SYSTÈME" (dernier paragraphe, 5-8 lignes) :
Explique pourquoi ce lieu est cohérent avec l'éco-tourisme et complémentaire à An Arwen. Commence ce paragraphe par "L'esprit Éco-Système".

IMPORTANT :
- Toutes les informations doivent être VÉRIFIABLES et RÉELLES
- Les coordonnées (téléphone, email, site web) doivent être EXACTES et ACTUELLES
- Les distances depuis An Arwen doivent être PRÉCISES
- Le lieu doit RÉELLEMENT EXISTER en Bretagne

Fournis ta réponse au format JSON suivant :
{
  "title": "Titre évocateur style magazine (sans caractères spéciaux, sans deux-points)",
  "excerpt": "Chapô immersif de 3-4 phrases (texte pur, sans formatage)",
  "content": "Article complet de 1000-1500 mots en texte fluide avec paragraphes séparés par des retours à la ligne doubles. AUCUN markdown, AUCUN caractère spécial. Inclure les marqueurs [IMAGE_1], [IMAGE_2], [IMAGE_3] aux emplacements stratégiques. Inclure naturellement les infos pratiques et l'encadré Esprit Eco-Système à la fin.",
  "location_name": "Nom exact du lieu",
  "location_address": "Adresse complète avec code postal",
  "location_phone": "Numéro de téléphone réel vérifié",
  "location_email": "Email de contact réel vérifié",
  "location_website": "Site web officiel vérifié",
  "distance_from_arwen": "Distance en km (ex: 12 km, environ 20 minutes)",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { 
            role: "system", 
            content: "Tu es un rédacteur-reporter premium de magazine Géo spécialisé en éco-tourisme breton. Tu rédiges des articles immersifs, poétiques et informatifs. Tu ne génères JAMAIS de caractères markdown (**, ##, #, [1]). Tu écris en texte fluide et naturel. Tu insères des marqueurs [IMAGE_1], [IMAGE_2], [IMAGE_3] pour indiquer les emplacements des photos. Tu vérifies toujours l'exactitude des informations. Réponds uniquement en JSON valide." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article",
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                excerpt: { type: "string" },
                content: { type: "string" },
                location_name: { type: "string" },
                location_address: { type: "string" },
                location_phone: { type: "string" },
                location_email: { type: "string" },
                location_website: { type: "string" },
                distance_from_arwen: { type: "string" },
                category: { type: "string" },
                tags: { type: "array", items: { type: "string" } }
              },
              required: ["title", "excerpt", "content", "location_name", "category"]
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const articleContent = data.choices[0]?.message?.content;
    
    if (!articleContent) {
      throw new Error("No content received from Perplexity");
    }

    let articleData: ArticleData;
    try {
      articleData = JSON.parse(articleContent);
    } catch (e) {
      console.error("Failed to parse article JSON:", articleContent);
      throw new Error("Invalid JSON response from Perplexity");
    }

    // Nettoyer le contenu des éventuels caractères markdown résiduels
    const cleanContent = (text: string): string => {
      return text
        .replace(/\*\*/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '')
        .replace(/\[(\d+)\]/g, '')
        .replace(/\*\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/---/g, '')
        .replace(/\n\s*[-•]\s*/g, '\n')
        .trim();
    };

    articleData.title = cleanContent(articleData.title);
    articleData.excerpt = cleanContent(articleData.excerpt);
    articleData.content = cleanContent(articleData.content);

    // Obtenir des images pertinentes pour la catégorie
    const images = getRandomImages(category);
    console.log("Selected featured image:", images.featured);
    console.log("Selected gallery images:", images.gallery);

    // Create slug from title
    const slug = articleData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: insertedArticle, error: insertError } = await supabase
      .from("ecosystem_articles")
      .insert({
        title: articleData.title,
        slug: slug,
        excerpt: articleData.excerpt,
        content: articleData.content,
        featured_image: images.featured,
        images: images.gallery,
        category: articleData.category,
        location_name: articleData.location_name,
        location_address: articleData.location_address || null,
        location_phone: articleData.location_phone || null,
        location_email: articleData.location_email || null,
        location_website: articleData.location_website || null,
        distance_from_arwen: articleData.distance_from_arwen || null,
        tags: articleData.tags || [],
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error(`Failed to save article: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        article: insertedArticle,
        citations: data.citations || []
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error generating article:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
