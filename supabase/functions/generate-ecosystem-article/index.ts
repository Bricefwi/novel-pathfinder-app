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

/**
 * Recherche dynamique d'images via Wikimedia Commons.
 * Retourne des photos RÉELLES du lieu recherché.
 */
async function searchWikimediaImages(query: string, limit: number = 6): Promise<string[]> {
  try {
    // Recherche sur Wikimedia Commons avec le nom exact du lieu
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200&format=json&origin=*`;
    
    console.log(`[Wikimedia Search] Query: "${query}"`);
    
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "AnArwen-EcoSysteme/1.0 (contact@an-arwen.com)" }
    });
    
    if (!response.ok) {
      console.error(`[Wikimedia Search] HTTP error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const pages = data.query?.pages;
    
    if (!pages) {
      console.log("[Wikimedia Search] No results found");
      return [];
    }
    
    const imageUrls: string[] = [];
    
    for (const page of Object.values(pages) as any[]) {
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo) continue;
      
      // Filtrer : uniquement les images JPEG/PNG, pas les SVG/icônes
      const mime = imageInfo.mime || "";
      if (!mime.startsWith("image/jpeg") && !mime.startsWith("image/png") && !mime.startsWith("image/webp")) {
        continue;
      }
      
      // Utiliser la version redimensionnée (1200px) si disponible
      const url = imageInfo.thumburl || imageInfo.url;
      if (url) {
        imageUrls.push(url);
      }
    }
    
    console.log(`[Wikimedia Search] Found ${imageUrls.length} images for "${query}"`);
    return imageUrls;
  } catch (error) {
    console.error("[Wikimedia Search] Error:", error);
    return [];
  }
}

/**
 * Stratégie multi-recherche : essaie plusieurs variantes de requêtes
 * pour maximiser les chances de trouver des images pertinentes.
 */
async function findBestImages(
  topic: string,
  locationName: string,
  keywords: string[],
  category: string
): Promise<{ featured: string; gallery: string[] }> {
  
  // Stratégie 1 : Recherche avec le nom exact du lieu
  let allImages = await searchWikimediaImages(topic);
  
  // Stratégie 2 : Si pas assez de résultats, essayer avec le nom du lieu seul
  if (allImages.length < 4 && locationName && locationName !== topic) {
    const more = await searchWikimediaImages(locationName);
    allImages = [...allImages, ...more];
  }
  
  // Stratégie 3 : Recherche avec le lieu + "Bretagne"
  if (allImages.length < 4) {
    const more = await searchWikimediaImages(`${topic} Bretagne`);
    allImages = [...allImages, ...more];
  }
  
  // Stratégie 4 : Recherche avec les mots-clés spécifiques
  if (allImages.length < 4 && keywords.length > 0) {
    const keywordQuery = keywords.slice(0, 3).join(" ");
    const more = await searchWikimediaImages(keywordQuery);
    allImages = [...allImages, ...more];
  }
  
  // Dédupliquer
  const uniqueImages = [...new Set(allImages)];
  
  console.log(`[Image Selection] Total unique images found: ${uniqueImages.length}`);
  
  // Si on a trouvé des images, les utiliser
  if (uniqueImages.length > 0) {
    const featured = uniqueImages[0];
    const gallery = uniqueImages.slice(1, 4);
    return { featured, gallery };
  }
  
  // Fallback : images génériques bretonnes par catégorie
  console.warn("[Image Selection] No Wikimedia images found, using fallback");
  return getFallbackImages(category);
}

/**
 * Images de secours par catégorie - uniquement si Wikimedia ne retourne rien.
 */
function getFallbackImages(category: string): { featured: string; gallery: string[] } {
  const fallbacks: Record<string, { featured: string; gallery: string[] }> = {
    "randonnee": {
      featured: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=800&fit=crop&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&h=600&fit=crop&q=80",
      ]
    },
    "ferme-pedagogique": {
      featured: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=800&fit=crop&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&h=600&fit=crop&q=80",
      ]
    },
    "patrimoine": {
      featured: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&h=800&fit=crop&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1524397057410-a44a7c4e82c6?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1565876427310-0695a4ff03b7?w=800&h=600&fit=crop&q=80",
      ]
    },
    "nature": {
      featured: "https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=1200&h=800&fit=crop&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&q=80",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop&q=80",
      ]
    },
  };
  
  return fallbacks[category] || fallbacks["nature"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[generate-ecosystem-article] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[generate-ecosystem-article] Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check admin role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roles) {
      console.error("[generate-ecosystem-article] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[generate-ecosystem-article] Authenticated admin: ${user.id}`);

    const { topic, category } = await req.json();

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Prompt maître premium style magazine Géo — Anti-hallucinations renforcé
    const prompt = `Tu es un rédacteur-reporter premium spécialisé en éco-tourisme, nature, patrimoine et tourisme responsable en Bretagne.
Ta mission est de rédiger un article de type magazine Géo, en français, pour une rubrique appelée "Eco-Système", liée à la Ferme Équestre An Arwen (5 Le Bignon, 35360 La Chapelle du Lou du Lac, Bretagne, FRANCE).

SUJET DE L'ARTICLE : "${topic}" dans la catégorie "${category}"

═══════════════════════════════════════════════════
RÈGLES ANTI-HALLUCINATIONS — OBLIGATOIRES — PRIORITÉ ABSOLUE
═══════════════════════════════════════════════════

1. VÉRIFICATION GÉOGRAPHIQUE STRICTE :
   - Le lieu traité DOIT être situé EN BRETAGNE (départements 22 Côtes-d'Armor, 29 Finistère, 35 Ille-et-Vilaine, 56 Morbihan) ou dans les départements limitrophes (44 Loire-Atlantique, 53 Mayenne, 50 Manche).
   - IMPORTANT : Un lieu situé dans les départements 22, 29, 35, 56, 44, 53 ou 50 EST VALIDE. Ne le rejette PAS.
   - Rejette UNIQUEMENT si le lieu est manifestement hors de France ou dans un département français non listé ci-dessus (ex: département 75 Paris, 13 Marseille, etc.).
   - Dans ce cas, retourne UNIQUEMENT ce JSON : {"error": "HORS_PERIMETRE", "reason": "Le lieu ${topic} n'est pas situé en Bretagne ni dans les départements limitrophes autorisés."}
   - NE JAMAIS inventer une version bretonne d'un lieu qui existe ailleurs.

2. DISTANCES ET TRAJETS — CALCUL RÉEL :
   - La Ferme An Arwen est à : 5 Le Bignon, 35360 La Chapelle du Lou du Lac (coordonnées GPS : 48.2167° N, 2.0333° O environ).
   - Les distances DOIVENT correspondre à un trajet routier réel vérifié.
   - Un lieu à 50 km prend environ 45 min à 1h en voiture en Bretagne (routes départementales).
   - Un lieu en Allemagne (Forêt-Noire) est à ~1000 km, PAS 50 km. REFUSE ce type d'article.
   - Si tu ne peux pas vérifier la distance exacte, indique "Distance à vérifier" plutôt que d'inventer.

3. SITES WEB ET COORDONNÉES — ZÉRO INVENTION :
   - NE JAMAIS inventer un site web, un numéro de téléphone ou un email.
   - Si tu ne trouves pas le site officiel vérifié d'un lieu, mets "Non disponible" dans le champ.
   - Un site web DOIT correspondre au lieu exact décrit. Ne mets PAS un site de tourisme régional comme site officiel d'un lieu spécifique.
   - Vérifie que l'URL correspond bien au lieu mentionné (pas un site générique de tourisme breton).

4. COHÉRENCE DU CONTENU :
   - Chaque fait mentionné (histoire, légende, faune, flore) doit être vérifiable.
   - Si tu n'es pas sûr d'une information, NE L'INCLUS PAS plutôt que de l'inventer.
   - Les noms de propriétaires, guides, ou personnes citées doivent être réels ou omis.
   - Les horaires et tarifs doivent être vérifiés ou omis avec la mention "se renseigner auprès du lieu".

═══════════════════════════════════════════════════
PÉRIMÈTRE GÉOGRAPHIQUE AUTORISÉ
═══════════════════════════════════════════════════
- Centre : Ferme Équestre An Arwen, 5 Le Bignon, 35360 La Chapelle du Lou du Lac
- Cercle 1 (0-15 km) : communes autour de La Chapelle du Lou du Lac, Montfort-sur-Meu, Bédée
- Cercle 2 (15-50 km) : Forêt de Brocéliande/Paimpont, Rennes, Dinan, Combourg
- Cercle 3 (50-150 km max) : Bretagne entière (Saint-Malo, Mont-Saint-Michel, Quimper, Vannes, côtes bretonnes)
- AU-DELÀ de 150 km : HORS PÉRIMÈTRE, REFUSE l'article.

═══════════════════════════════════════════════════
CONSIGNES DE RÉDACTION
═══════════════════════════════════════════════════
1. AUCUN caractère markdown : pas de **, ##, #, [1], *** ou autre formatage technique
2. Rédige en texte fluide et naturel, comme un vrai journaliste de magazine
3. Utilise des paragraphes aérés avec des retours à la ligne simples
4. Le texte doit sembler écrit par un humain passionné, pas par une IA
5. Style narratif, contemplatif, sensoriel, jamais publicitaire
6. Intègre des touches de culture locale : légendes bretonnes, histoire locale, patrimoine régional

STRUCTURE DE L'ARTICLE :

Le contenu doit inclure des marqueurs [IMAGE_1], [IMAGE_2], [IMAGE_3] à des endroits stratégiques dans le texte (après 2-3 paragraphes) pour indiquer où les photos d'illustration doivent être insérées.

TITRE : Un titre évocateur et poétique (sans ponctuation spéciale, sans deux-points)

CHAPÔ (3-4 phrases) : Introduction sensorielle et immersive. Situe le lieu par rapport à la Ferme An Arwen avec une distance RÉELLE.

CORPS DE L'ARTICLE (1000-1500 mots) :
Écris en paragraphes fluides séparés par des doubles retours à la ligne.
- Descriptions des paysages BRETONS réels, faune et flore locales
- Mise en scène d'itinéraires ou activités concrètes et vérifiables
- Engagements éco-touristiques du lieu
- Suggestions de combinaisons avec un séjour à An Arwen

INFOS PRATIQUES (intégrées naturellement, pas de liste à puces) :
Nom complet, adresse postale RÉELLE, coordonnées VÉRIFIÉES uniquement. Si une info n'est pas vérifiable, l'omettre.

ENCADRÉ "L'ESPRIT ECO-SYSTÈME" (dernier paragraphe, 5-8 lignes) :
Explique pourquoi ce lieu BRETON est cohérent avec l'éco-tourisme et complémentaire à An Arwen.

Fournis ta réponse au format JSON suivant :
{
  "title": "Titre évocateur style magazine",
  "excerpt": "Chapô immersif de 3-4 phrases",
  "content": "Article complet 1000-1500 mots. AUCUN markdown. Marqueurs [IMAGE_1], [IMAGE_2], [IMAGE_3]. Infos pratiques et Esprit Eco-Système à la fin.",
  "location_name": "Nom exact du lieu RÉEL en Bretagne",
  "location_address": "Adresse complète RÉELLE avec code postal breton (22xxx, 29xxx, 35xxx, 56xxx, ou limitrophe)",
  "location_phone": "Numéro vérifié ou 'Non disponible'",
  "location_email": "Email vérifié ou 'Non disponible'",
  "location_website": "Site web OFFICIEL du lieu vérifié ou 'Non disponible'",
  "distance_from_arwen": "Distance routière RÉELLE en km depuis La Chapelle du Lou du Lac",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "image_search_keywords": ["mots-clés SPÉCIFIQUES au lieu breton pour recherche d'images pertinentes, par exemple le nom exact du lac, du château, de la forêt"]
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
            content: "Tu es un rédacteur-reporter premium de magazine Géo spécialisé EXCLUSIVEMENT en éco-tourisme BRETON. RAPPEL GÉOGRAPHIQUE CRUCIAL : Les départements 22 (Côtes-d'Armor), 29 (Finistère), 35 (Ille-et-Vilaine), 56 (Morbihan) SONT la Bretagne. Les départements limitrophes 44 (Loire-Atlantique), 53 (Mayenne), 50 (Manche) sont aussi acceptés. Un lieu situé dans l'un de ces départements est VALIDE et tu DOIS rédiger l'article. Ne rejette un sujet QUE si le lieu est manifestement hors de France ou dans un département non listé ci-dessus. RÈGLES : 1) Tu n'inventes JAMAIS de sites web, numéros de téléphone ou emails — mets 'Non disponible' si incertain. 2) Tu n'inventes JAMAIS de distances — mets 'Distance à vérifier' si incertain. 3) Tu ne génères JAMAIS de markdown. 4) Tu écris en texte fluide. 5) Tu insères [IMAGE_1], [IMAGE_2], [IMAGE_3]. Réponds uniquement en JSON valide." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
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

    let articleData: any;
    try {
      let jsonStr = articleContent.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      articleData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse article JSON:", articleContent);
      throw new Error("Invalid JSON response from Perplexity");
    }

    // ANTI-HALLUCINATION: Check if AI refused the topic (out of scope)
    if (articleData.error === "HORS_PERIMETRE" || articleData.error) {
      console.warn("[generate-ecosystem-article] AI rejected topic as out of scope:", articleData.reason || articleData.error);
      return new Response(
        JSON.stringify({ 
          error: `Le sujet "${topic}" a été rejeté par l'IA : ${articleData.reason || "Ce lieu ne se situe pas en Bretagne. L'Éco-Système ne couvre que la Bretagne et ses environs proches."}`,
          rejection: true 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ANTI-HALLUCINATION: Validate postal code is Breton region
    const address = articleData.location_address || "";
    const postalCodeMatch = address.match(/\b(\d{5})\b/);
    if (postalCodeMatch) {
      const dept = postalCodeMatch[1].substring(0, 2);
      const allowedDepts = ["22", "29", "35", "56", "44", "53", "50"];
      if (!allowedDepts.includes(dept)) {
        console.warn(`[generate-ecosystem-article] Invalid postal code department: ${dept} for topic: ${topic}`);
        return new Response(
          JSON.stringify({ 
            error: `L'article généré mentionne un code postal hors Bretagne (${postalCodeMatch[1]}). Le lieu "${topic}" ne semble pas être en Bretagne. Veuillez choisir un sujet breton.`,
            rejection: true 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Clean "Non disponible" placeholders
    if (articleData.location_phone === "Non disponible") articleData.location_phone = null;
    if (articleData.location_email === "Non disponible") articleData.location_email = null;
    if (articleData.location_website === "Non disponible") articleData.location_website = null;
    if (articleData.distance_from_arwen === "Distance à vérifier") articleData.distance_from_arwen = "À vérifier";

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

    // RECHERCHE D'IMAGES DYNAMIQUE via Wikimedia Commons
    // Utilise le nom du lieu + les mots-clés pour trouver de VRAIES photos
    const imageKeywords = articleData.image_search_keywords || [];
    const locationName = articleData.location_name || topic;
    
    console.log(`[Image Search] Searching real images for: "${topic}" / "${locationName}"`);
    console.log(`[Image Search] Keywords: ${imageKeywords.join(", ")}`);
    
    const images = await findBestImages(topic, locationName, imageKeywords, category);
    
    console.log("Selected featured image:", images.featured);
    console.log("Selected gallery images:", images.gallery);

    // Create slug from title
    const slug = articleData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
