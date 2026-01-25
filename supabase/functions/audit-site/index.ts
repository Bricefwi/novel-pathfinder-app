import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";

const AUDIT_SYSTEM_PROMPT = `Tu es un expert senior en développement web, sécurité, accessibilité et UX.
Tu réalises un audit complet d'une application React/Vite/Supabase nommée "An Arwen" (ferme équestre en Bretagne).

CONTEXTE DE L'APPLICATION:
- Site vitrine et booking pour randonnées équestres
- Hébergement en yourte
- Espace client avec profil, devis, factures
- Panel admin (Control Tower) pour la gestion

CRITÈRES D'ÉVALUATION:

1. SÉCURITÉ (20%):
- Politiques RLS sur les tables
- Validation des entrées utilisateur
- Protection XSS/CSRF
- Gestion des tokens et sessions
- CORS configuré correctement

2. PERFORMANCE (15%):
- Lazy loading des composants/images
- Optimisation des requêtes DB
- Taille du bundle
- Mise en cache

3. SEO (15%):
- Balises meta (title, description)
- Structure sémantique HTML
- Fichiers robots.txt, sitemap.xml, llms.txt
- Schema.org / JSON-LD

4. ACCESSIBILITÉ (20%):
- Attributs alt sur les images
- Labels ARIA
- Navigation clavier
- Contrastes de couleurs
- Structure des headings

5. UX/DESIGN (15%):
- Cohérence visuelle
- Responsive design
- Parcours utilisateur fluide
- Feedback utilisateur

6. QUALITÉ DU CODE (15%):
- Bonnes pratiques React/TypeScript
- Composants réutilisables
- Gestion d'erreurs
- Structure du projet

STRUCTURE DU RAPPORT ATTENDU (JSON STRICT):
{
  "scores": {
    "security": <number 0-100>,
    "performance": <number 0-100>,
    "seo": <number 0-100>,
    "accessibility": <number 0-100>,
    "ux": <number 0-100>,
    "code_quality": <number 0-100>
  },
  "global_score": <number 0-100>,
  "findings": [
    {
      "category": "security|performance|seo|accessibility|ux|code",
      "severity": "critical|high|medium|low",
      "title": "Titre court du problème",
      "description": "Description détaillée du problème identifié",
      "location": "Fichier ou composant concerné",
      "recommendation": "Solution concrète à implémenter",
      "code_example": "Code correctif si applicable (optionnel)"
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "security|performance|seo|accessibility|ux|code",
      "title": "Titre de la recommandation",
      "description": "Description de l'amélioration suggérée",
      "impact": "Impact attendu sur le site"
    }
  ],
  "summary": "Résumé en 3-4 phrases de l'état général du site"
}

IMPORTANT: 
- Sois précis et factuel dans ton analyse
- Cite des fichiers/composants spécifiques quand tu identifies un problème
- Propose des solutions concrètes et actionnables
- Le score global est une moyenne pondérée selon les pourcentages indiqués`;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Authenticate and verify admin role
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return createAuthErrorResponse("Non authentifié", 401, corsHeaders);
    }

    const { supabase, user } = authResult;
    const isAdmin = await verifyAdminRole(supabase, user.id);
    
    if (!isAdmin) {
      return createAuthErrorResponse("Accès refusé - Admin requis", 403, corsHeaders);
    }

    // Parse request body
    const { audit_type = "full" } = await req.json().catch(() => ({}));

    // Create audit report entry with pending status
    const { data: auditReport, error: insertError } = await supabase
      .from("audit_reports")
      .insert({
        created_by: user.id,
        audit_type,
        status: "running",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Impossible de créer le rapport d'audit");
    }

    // Collect project context for the audit
    const projectContext = {
      application: {
        name: "An Arwen - Ferme Équestre",
        stack: "React 18, Vite, TypeScript, Tailwind CSS, Supabase",
        type: "Site vitrine + Booking + Espace client + Admin",
      },
      pages: [
        "Index (Accueil)",
        "Destinations (Liste des activités)",
        "Hebergement (Yourte)",
        "EcoSysteme (Blog partenaires)",
        "Galerie (Photos)",
        "Contact",
        "DemandeDevis (Formulaire)",
        "Auth (Connexion/Inscription)",
        "MonEspace (Espace client)",
        "Admin (Control Tower)",
        "Planning",
        "CarnetVoyage",
        "PreparerVoyage",
      ],
      components: {
        admin: ["ControlTower", "AdminDashboard", "CRM360", "StockManagement", "TrafficAnalytics"],
        user: ["TravelHub", "ClientTimeline", "UserDocuments"],
        layout: ["Header", "Footer", "Layout"],
        seo: ["SEOHead", "SchemaFactory"],
      },
      edge_functions: [
        "ask-loic (Assistant IA)",
        "analyze-prospect (Analyse comportementale)",
        "notify-admin",
        "send-quote-email",
        "send-invoice-email",
        "generate-ecosystem-article",
        "test-system",
      ],
      database: {
        tables: [
          "profiles",
          "activities",
          "activity_slots",
          "bookings",
          "quotes",
          "invoices",
          "testimonials",
          "user_reviews",
          "gallery_photos",
          "ecosystem_articles",
          "newsletter_subscribers",
          "analytics_events",
          "user_roles",
        ],
        rls_enabled: true,
        storage_buckets: ["avatars", "review-photos"],
      },
      seo_files: {
        robots_txt: true,
        sitemap_xml: true,
        llms_txt: true,
      },
      security: {
        auth_method: "Supabase Auth (Email/Password + OAuth Google)",
        rls_policies: "Activées sur toutes les tables",
        rbac: "Table user_roles avec fonction has_role()",
        cors: "Configuré dans les edge functions",
      },
      known_features: [
        "Système de devis/factures avec PDF",
        "Chat communautaire par activité",
        "Analyse IA des prospects",
        "Newsletter automatique",
        "Avis clients avec photos",
        "Calendrier de réservation",
      ],
    };

    // Build the prompt for Gemini
    const auditPrompt = `Analyse ce contexte d'application et génère un rapport d'audit complet:

${JSON.stringify(projectContext, null, 2)}

Génère un rapport JSON valide suivant la structure demandée. Sois critique mais constructif.`;

    // Call Lovable AI Gateway with Gemini 3 Pro
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: AUDIT_SYSTEM_PROMPT },
          { role: "user", content: auditPrompt },
        ],
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      // Update audit report with failed status
      await supabase
        .from("audit_reports")
        .update({ 
          status: "failed",
          raw_response: `Error ${aiResponse.status}: ${errorText}`
        })
        .eq("id", auditReport.id);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Erreur lors de l'appel à l'IA");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response from AI
    let auditResult;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Pas de JSON valide dans la réponse");
      }
      auditResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Update with failed status but keep raw response for debugging
      await supabase
        .from("audit_reports")
        .update({ 
          status: "failed",
          raw_response: rawContent
        })
        .eq("id", auditReport.id);
      
      throw new Error("Impossible de parser le rapport d'audit");
    }

    // Update the audit report with results
    const { error: updateError } = await supabase
      .from("audit_reports")
      .update({
        status: "completed",
        scores: auditResult.scores,
        global_score: auditResult.global_score,
        findings: auditResult.findings,
        recommendations: auditResult.recommendations,
        raw_response: rawContent,
      })
      .eq("id", auditReport.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Impossible de sauvegarder le rapport");
    }

    return new Response(
      JSON.stringify({
        success: true,
        audit_id: auditReport.id,
        scores: auditResult.scores,
        global_score: auditResult.global_score,
        findings_count: auditResult.findings?.length || 0,
        summary: auditResult.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Audit error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
