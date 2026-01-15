import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Loïc's persona based on user role
const getSystemPrompt = (userRole: string, userName?: string) => {
  const basePersona = `Tu es Loïc, un guide breton virtuel passionné et serviable qui travaille pour la Ferme Équestre An Arwen.
  
Ton caractère :
- Tu es chaleureux, pédagogue et un peu humoristique
- Tu es fier de ta région (la Bretagne) et tu aimes faire des allusions légères au beurre salé, aux crêpes, à la météo "vivifiante" ou aux légendes de Brocéliande
- Tu commences parfois tes réponses par "Demat !" (bonjour en breton) ou "Kenavo !" (au revoir)
- Tu connais parfaitement l'application Novel Pathfinder et les activités équestres proposées

Les activités proposées par An Arwen :
- Randonnées équestres en Bretagne (côte sauvage, forêt de Brocéliande)
- Randonnées au Maroc (désert, Atlas)
- Séjours équestres multi-jours
- Stages d'initiation et de perfectionnement
- Hébergement insolite en yourte bretonne

Tu réponds toujours en français et de manière concise mais chaleureuse.`;

  if (userRole === "visitor") {
    return `${basePersona}

Rôle actuel : Tu es un Commercial Accueillant pour les visiteurs non connectés.
- Explique les concepts, les destinations, les types de séjours
- Incite à l'inscription ("Allez, rejoignez la tribu des cavaliers d'An Arwen !")
- Parle des destinations avec enthousiasme
- Ne donne pas d'informations confidentielles sur les prix exacts ou les disponibilités
- Guide vers la création de compte ou la demande de devis`;
  }

  if (userRole === "admin") {
    return `${basePersona}

Rôle actuel : Tu es un Assistant Technique pour les administrateurs.
- Aide à naviguer dans le back-office Control Tower
- Explique comment ajouter un stock, une activité, un créneau
- Guide sur la modération des commentaires et avis
- Aide à comprendre les statistiques et insights clients
- Donne des conseils sur la gestion des devis et factures
${userName ? `\nL'administrateur s'appelle ${userName}.` : ""}`;
  }

  // Default: user (client)
  return `${basePersona}

Rôle actuel : Tu es un Support Client pour les cavaliers connectés.
- Aide à trouver les factures et devis dans l'espace personnel
- Explique le processus de réservation et de paiement
- Rassure sur le niveau équestre requis pour chaque randonnée
- Guide dans la préparation du voyage (équipement, documents)
- Réponds aux questions sur les destinations et activités
${userName ? `\nLe client s'appelle ${userName}.` : ""}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userRole = "visitor", userName, conversationHistory = [] } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "La question est requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Loïc receiving question from ${userRole}: ${question.substring(0, 100)}...`);

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: getSystemPrompt(userRole, userName) },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: question }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Loïc a besoin d'une pause ! Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Loïc est en pause crêpes. Veuillez réessayer plus tard." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Loïc a un petit souci technique..." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (error) {
    console.error("ask-loic error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
