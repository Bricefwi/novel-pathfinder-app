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
  featured_image: string;
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

    // Generate article content with Perplexity
    const prompt = `Tu es un rédacteur de magazine Géo spécialisé en éco-tourisme breton. Recherche et rédige un article RÉEL et DÉTAILLÉ sur "${topic}" dans la catégorie "${category}".

LOCALISATION DE RÉFÉRENCE: Ferme Équestre An Arwen, 5 Le Bignon, 35360 La Chapelle du Lou du Lac, Bretagne, France.

L'article doit porter sur un lieu RÉEL existant dans un rayon de 50km autour de cette adresse (région Bretagne uniquement).

Fournis les informations au format JSON suivant:
{
  "title": "Titre accrocheur style magazine",
  "excerpt": "Résumé attractif de 2-3 phrases",
  "content": "Article complet de 500-800 mots en markdown avec sections, descriptions immersives et informations pratiques",
  "location_name": "Nom exact du lieu/établissement",
  "location_address": "Adresse complète avec code postal",
  "location_phone": "Numéro de téléphone réel",
  "location_email": "Email de contact réel",
  "location_website": "Site web officiel",
  "distance_from_arwen": "Distance approximative depuis An Arwen (ex: '12 km')",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3"],
  "featured_image": "URL d'une image réelle du lieu depuis Wikipedia, site officiel ou autre source libre de droits"
}

IMPORTANT: 
- Utilise UNIQUEMENT des informations vérifiables et réelles
- Les coordonnées doivent être exactes et actuelles
- L'image doit être une URL réelle et accessible
- Le contenu doit être original et engageant`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "Tu es un expert en éco-tourisme breton. Réponds uniquement en JSON valide." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
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
                featured_image: { type: "string" }
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
        featured_image: articleData.featured_image || null,
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