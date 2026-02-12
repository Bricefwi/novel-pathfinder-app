import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, tone, audience } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquante" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un rédacteur marketing expert pour la Ferme Équestre An Arwen, un centre équestre en Bretagne qui propose des randonnées, séjours et stages à cheval en France et à l'étranger (Maroc, Mongolie, Jordanie, Écosse...).

Tu rédiges des newsletters engageantes en HTML simple (utilise <h2>, <p>, <ul>, <li>, <strong>, <em>, <br>).

Règles :
- Ton chaleureux et passionné, avec des touches bretonnes
- Toujours inclure un appel à l'action clair
- Utiliser des emojis avec parcimonie (🐴 🌅 🏇 ✨)
- Adapter le contenu au public cible si précisé
- Signer "L'équipe de la Ferme Équestre An Arwen"
- Ne PAS inclure de header/footer/wrapper HTML, juste le contenu du corps
- Écrire en français

Tonalité demandée : ${tone || "engageant et chaleureux"}
${audience ? `Public cible : ${audience}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt || "Rédige une newsletter promotionnelle pour les prochains séjours équestres disponibles." },
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI error (${response.status}):`, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to extract a subject line from the content
    const subjectMatch = content.match(/(?:Objet|Sujet)\s*:\s*(.+?)(?:\n|<)/i);
    const suggestedSubject = subjectMatch ? subjectMatch[1].trim() : "";

    return new Response(JSON.stringify({ content, suggestedSubject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-newsletter-content error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
