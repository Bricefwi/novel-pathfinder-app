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

// Fonction pour récupérer des images Unsplash pertinentes
async function fetchUnsplashImages(keywords: string[], count: number = 4): Promise<string[]> {
  const images: string[] = [];
  
  // Combiner les mots-clés pour une recherche pertinente
  const searchQueries = [
    keywords.join(" "),
    keywords[0] || "Bretagne nature",
    "Bretagne paysage",
    "France campagne"
  ];

  for (let i = 0; i < Math.min(count, searchQueries.length); i++) {
    try {
      const query = encodeURIComponent(searchQueries[i]);
      // Utiliser l'API Unsplash Source (gratuit, pas de clé requise)
      // Format: https://source.unsplash.com/featured/?{query}&{random}
      const imageUrl = `https://images.unsplash.com/photo-${generateRandomImageId()}?w=1200&h=800&fit=crop&q=80`;
      
      // Alternative: utiliser des images Unsplash via leur CDN avec recherche
      const unsplashSearchUrl = `https://source.unsplash.com/1200x800/?${query}&sig=${Date.now() + i}`;
      images.push(unsplashSearchUrl);
    } catch (error) {
      console.error("Error fetching Unsplash image:", error);
    }
  }

  // Si pas assez d'images, ajouter des images par défaut de nature bretonne
  const defaultImages = [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop&q=80", // Landscape
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop&q=80", // Mountains forest
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop&q=80", // Forest path
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&h=800&fit=crop&q=80", // Countryside
  ];

  while (images.length < count) {
    images.push(defaultImages[images.length % defaultImages.length]);
  }

  return images;
}

function generateRandomImageId(): string {
  // IDs d'images Unsplash réelles liées à la nature, Bretagne, France
  const realImageIds = [
    "1506905925346-21bda4d32df4", // Nature paysage
    "1441974231531-c6227db76b6e", // Forêt
    "1472214103451-9374bd1c798e", // Campagne
    "1501785888041-af3ef285b470", // Paysage vert
    "1465056836041-7f43ac27dcb5", // Lac
    "1504567961542-e24d9439a724", // Collines
    "1475924156734-496f6cac6ec1", // Prairie
    "1470071459604-3b5ec3a7fe05", // Nature verte
    "1542202229-7d93c33f5d07", // Château
    "1558618666-fcd25c85cd64", // Architecture ancienne
  ];
  return realImageIds[Math.floor(Math.random() * realImageIds.length)];
}

// Mapping des catégories vers des mots-clés de recherche d'images
const categoryImageKeywords: Record<string, string[]> = {
  "Randonnées": ["hiking trail forest", "Brittany landscape path", "nature walking France"],
  "Fermes Pédagogiques": ["farm animals countryside", "educational farm France", "rural farm Brittany"],
  "Patrimoine": ["castle France medieval", "historic chateau Brittany", "french heritage architecture"],
  "Nature": ["nature reserve lake", "wildlife wetlands France", "natural pond birds"],
};

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

TITRE : Un titre évocateur et poétique (sans ponctuation spéciale, sans deux-points)

CHAPÔ (3-4 phrases) : Introduction sensorielle et immersive avec lumière, odeurs, sons, saison. Situe le lieu par rapport à la Ferme An Arwen.

CORPS DE L'ARTICLE (800-1200 mots) :
Écris en paragraphes fluides séparés par des doubles retours à la ligne.
- Descriptions détaillées des paysages, faune et flore
- Mise en scène d'itinéraires ou activités concrètes
- Engagements éco-touristiques du lieu
- Suggestions de combinaisons avec un séjour à An Arwen

À la fin du corps de l'article, inclure naturellement :

INFOS PRATIQUES (intégrées dans un paragraphe fluide, pas de liste à puces) :
Nom complet et type de structure, adresse postale complète, téléphone, email, site web officiels (VÉRIFIE que ces coordonnées sont réelles), horaires et saisonnalité, distance et temps de trajet depuis An Arwen, conseils pratiques (équipement, niveau de difficulté).

ENCADRÉ "L'ESPRIT ECO-SYSTÈME" (dernier paragraphe, 5-8 lignes) :
Explique pourquoi ce lieu est cohérent avec l'éco-tourisme et complémentaire à An Arwen. Commence ce paragraphe par "L'esprit Éco-Système".

MOTS-CLÉS POUR IMAGES :
Fournis 4 mots-clés en anglais décrivant des images qui illustreraient parfaitement cet article (pour recherche sur banque d'images). Par exemple : "forest trail Brittany", "medieval castle France", "farm animals children", "lake wetlands birds".

IMPORTANT :
- Toutes les informations doivent être VÉRIFIABLES et RÉELLES
- Les coordonnées (téléphone, email, site web) doivent être EXACTES et ACTUELLES
- Les distances depuis An Arwen doivent être PRÉCISES
- Le lieu doit RÉELLEMENT EXISTER en Bretagne

Fournis ta réponse au format JSON suivant :
{
  "title": "Titre évocateur style magazine (sans caractères spéciaux, sans deux-points)",
  "excerpt": "Chapô immersif de 3-4 phrases (texte pur, sans formatage)",
  "content": "Article complet de 800-1200 mots en texte fluide avec paragraphes séparés par des retours à la ligne doubles. AUCUN markdown, AUCUN caractère spécial. Inclure naturellement les infos pratiques et l'encadré Esprit Eco-Système à la fin.",
  "location_name": "Nom exact du lieu",
  "location_address": "Adresse complète avec code postal",
  "location_phone": "Numéro de téléphone réel vérifié",
  "location_email": "Email de contact réel vérifié",
  "location_website": "Site web officiel vérifié",
  "distance_from_arwen": "Distance en km (ex: 12 km, environ 20 minutes)",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "image_search_keywords": ["keyword1 in english", "keyword2 in english", "keyword3 in english", "keyword4 in english"]
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
            content: "Tu es un rédacteur-reporter premium de magazine Géo spécialisé en éco-tourisme breton. Tu rédiges des articles immersifs, poétiques et informatifs. Tu ne génères JAMAIS de caractères markdown (**, ##, #, [1]). Tu écris en texte fluide et naturel. Tu vérifies toujours l'exactitude des informations. Réponds uniquement en JSON valide." 
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
                tags: { type: "array", items: { type: "string" } },
                image_search_keywords: { type: "array", items: { type: "string" } }
              },
              required: ["title", "excerpt", "content", "location_name", "category", "image_search_keywords"]
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
        .replace(/\n\s*[-•]\s*/g, '\n') // Remove bullet points
        .trim();
    };

    articleData.title = cleanContent(articleData.title);
    articleData.excerpt = cleanContent(articleData.excerpt);
    articleData.content = cleanContent(articleData.content);

    // Récupérer des images Unsplash pertinentes basées sur les mots-clés
    const imageKeywords = articleData.image_search_keywords || 
      categoryImageKeywords[category] || 
      ["Brittany nature landscape"];
    
    console.log("Fetching images for keywords:", imageKeywords);
    
    // Construire les URLs d'images Unsplash avec les mots-clés spécifiques
    const featuredImageQuery = encodeURIComponent(imageKeywords[0] || `${category} Brittany France`);
    const featuredImage = `https://source.unsplash.com/1200x800/?${featuredImageQuery}&sig=${Date.now()}`;
    
    const galleryImages: string[] = [];
    for (let i = 1; i < Math.min(4, imageKeywords.length); i++) {
      const query = encodeURIComponent(imageKeywords[i]);
      galleryImages.push(`https://source.unsplash.com/800x600/?${query}&sig=${Date.now() + i}`);
    }

    console.log("Featured image URL:", featuredImage);
    console.log("Gallery images:", galleryImages);

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
        featured_image: featuredImage,
        images: galleryImages,
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
