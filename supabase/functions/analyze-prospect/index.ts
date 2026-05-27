import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";

const SYSTEM_PROMPT = `Tu es un expert marketing pour le centre équestre 'Ferme Équestre Arwen'.

Analyse l'historique de navigation fourni ci-dessous.

Tâche :

1. Estime le 'Budget Probable' (Élevé, Moyen, Éco) en fonction des services consultés (Stages/Pension = Élevé, Balade = Éco).

2. Identifie l'intention principale (Loisir, Compétition, Propriétaire, Parent).

3. Suggère 2 produits spécifiques du catalogue adaptés à ce profil.

4. Reste factuel. Si le comportement est flou, dis-le.

Réponds UNIQUEMENT au format JSON avec cette structure exacte :
{
  "budget_probable": "Élevé" | "Moyen" | "Éco",
  "intention_principale": "Loisir" | "Compétition" | "Propriétaire" | "Parent" | "Indéterminé",
  "confiance": "haute" | "moyenne" | "faible",
  "produits_suggeres": [
    { "nom": "string", "raison": "string" },
    { "nom": "string", "raison": "string" }
  ],
  "analyse_resume": "string (2-3 phrases max)"
}`;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // ── Auth ──
    const auth = await authenticateRequest(req);
    if (!auth) {
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    const { user_id, session_id } = await req.json();

    if (!user_id && !session_id) {
      return new Response(
        JSON.stringify({ error: "user_id ou session_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only admins, or users requesting their own analysis, are allowed
    const isAdmin = await verifyAdminRole(auth.supabase, auth.user.id);
    if (!isAdmin && (!user_id || user_id !== auth.user.id)) {
      return createAuthErrorResponse("Forbidden", 403, corsHeaders);
    }

    // Initialize Supabase client (service role used only after auth passed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);


    // Build query for analytics events
    let query = supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (user_id) {
      query = query.eq("user_id", user_id);
    } else if (session_id) {
      query = query.eq("session_id", session_id);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error("Erreur récupération événements:", eventsError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la récupération des événements" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check minimum events threshold
    if (!events || events.length < 3) {
      return new Response(
        JSON.stringify({
          status: "insufficient_data",
          message: "Pas assez de données pour une analyse fiable.",
          events_count: events?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format events for AI analysis
    const eventsForAnalysis = events.map((e) => ({
      type: e.event_type,
      page: e.page_path,
      source: e.source,
      metadata: e.metadata,
      timestamp: e.created_at,
    }));

    const userPrompt = `Voici l'historique de navigation du visiteur (${events.length} événements) :

${JSON.stringify(eventsForAnalysis, null, 2)}

Analyse ce comportement et fournis ton évaluation.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY non configurée");
      return new Response(
        JSON.stringify({ error: "Configuration IA manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Erreur AI Gateway:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Réponse IA vide" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      analysis = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({
          status: "analysis_complete",
          raw_response: content,
          parse_error: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        events_analyzed: events.length,
        visitor_id: user_id || session_id,
        visitor_type: user_id ? "authenticated" : "anonymous",
        analysis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur analyze-prospect:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
