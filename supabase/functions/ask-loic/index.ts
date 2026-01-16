import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static knowledge about the app structure
const APP_KNOWLEDGE = `
### CONNAISSANCE DE L'APPLICATION AN ARWEN

**Navigation du site :**
- Accueil : Présentation générale et carrousel de photos
- Destinations : Catalogue des séjours par pays (France/Bretagne, Maroc, International)
- Planning : Calendrier des activités avec créneaux disponibles
- Hébergement : La Yourte An Arwen (réservation via Airbnb)
- Galerie : Photos des aventures équestres
- Préparer Voyage : Guide complet pour préparer son séjour
- Éco-Système : Blog des partenaires locaux bretons
- Contact : Formulaire de contact et demande de devis

**Espace Client (Mon Espace) :**
- Dashboard avec statut du voyage (compte à rebours avant départ)
- Mes Voyages : Historique et réservations en cours
- Documents : Devis, factures et coffre-fort numérique
- Profil : Niveau équestre, préférences, destinations rêvées
- Chat communautaire avec autres cavaliers

**Processus de réservation :**
1. Consulter les destinations sur /destinations
2. Cliquer sur "Réserver" pour accéder au formulaire de devis
3. Remplir le formulaire avec dates et participants
4. Recevoir un devis personnalisé par email
5. Valider le devis dans l'espace client (signature électronique + CGU/CGV)
6. Payer l'acompte ou le montant total
7. Recevoir la facture dans l'espace client

**Niveaux équestres :**
- Débutant : Pas ou peu d'expérience, idéal pour stages d'initiation
- Intermédiaire : À l'aise au pas et au trot, quelques galops
- Confirmé : Autonome aux trois allures, expérience de randonnée
- Expert : Cavalier très expérimenté, toutes situations

**Types d'activités :**
- Randonnée : Balades de 1 à plusieurs jours
- Séjour : Formule tout compris avec hébergement
- Stage : Formation intensive sur plusieurs jours
- Cours : Leçons d'équitation à l'unité

**Contact :**
- Téléphone/WhatsApp : +33 6 59 22 62 70
- Email : via le formulaire de contact
- Adresse : Ferme An Arwen, Bretagne

**Hébergement Yourte :**
- Yourte traditionnelle mongole
- Capacité : 4 personnes
- Réservation via Airbnb uniquement
- Inclut petit-déjeuner et accès à la ferme
`;

// Format activity slots into readable text
const formatLiveOffers = (activities: any[], slots: any[]): string => {
  if (!activities || activities.length === 0) {
    return "Aucune offre active pour le moment.";
  }

  const activityMap = new Map();
  activities.forEach(a => activityMap.set(a.id, a));

  // Group slots by activity
  const slotsByActivity = new Map<string, any[]>();
  slots.forEach(slot => {
    if (!slotsByActivity.has(slot.activity_id)) {
      slotsByActivity.set(slot.activity_id, []);
    }
    slotsByActivity.get(slot.activity_id)!.push(slot);
  });

  const lines: string[] = [];
  const activityTypes: Record<string, string> = {
    randonnee: "Randonnée",
    sejour: "Séjour",
    stage: "Stage",
    cours: "Cours"
  };

  const levels: Record<string, string> = {
    debutant: "Débutant",
    intermediaire: "Intermédiaire",
    confirme: "Confirmé",
    expert: "Expert"
  };

  activities.forEach(activity => {
    const activitySlots = slotsByActivity.get(activity.id) || [];
    const type = activityTypes[activity.activity_type] || activity.activity_type;
    const level = activity.riding_level ? levels[activity.riding_level] || activity.riding_level : "Tous niveaux";
    const region = activity.region || activity.country || "France";
    const duration = activity.duration || "Variable";
    const priceRange = activity.price_from 
      ? (activity.price_to && activity.price_to !== activity.price_from 
          ? `${activity.price_from}€ à ${activity.price_to}€` 
          : `${activity.price_from}€`)
      : "Sur devis";

    // Count available spots
    const futureSlots = activitySlots.filter((s: any) => {
      const startDate = new Date(s.start_date);
      return startDate > new Date() && s.is_available;
    });

    let availability = "";
    if (futureSlots.length === 0) {
      availability = "COMPLET / Pas de créneaux prochains";
    } else {
      const nextSlot = futureSlots.sort((a: any, b: any) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )[0];
      
      const remaining = (nextSlot.max_participants || 0) - (nextSlot.current_participants || 0);
      const dateStr = new Date(nextSlot.start_date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      
      if (remaining <= 0) {
        availability = `Prochain : ${dateStr} - COMPLET`;
      } else if (remaining <= 2) {
        availability = `Prochain : ${dateStr} - ⚠️ DERNIÈRES PLACES (${remaining} restante${remaining > 1 ? 's' : ''})`;
      } else {
        availability = `Prochain : ${dateStr} - ${remaining} places disponibles`;
      }
    }

    lines.push(`- **${activity.title}** (${type} - ${region})
  • Durée : ${duration} | Prix : ${priceRange} | Niveau : ${level}
  • ${availability}`);
  });

  return lines.join("\n\n");
};

// Build the complete system prompt with live data
const getSystemPrompt = (
  userRole: string, 
  userName: string | undefined, 
  liveOffers: string
) => {
  const basePersona = `Tu es Loïc, un guide breton virtuel passionné et serviable qui travaille pour la Ferme Équestre An Arwen.
  
Ton caractère :
- Tu es chaleureux, pédagogue et un peu humoristique
- Tu es fier de ta région (la Bretagne) et tu aimes faire des allusions légères au beurre salé, aux crêpes, à la météo "vivifiante" ou aux légendes de Brocéliande
- Tu commences parfois tes réponses par "Demat !" (bonjour en breton) ou "Kenavo !" (au revoir)
- Tu connais parfaitement l'application Novel Pathfinder et les activités équestres proposées

Tu réponds toujours en français et de manière concise mais chaleureuse.

RÈGLE ABSOLUE : Pour toute question sur les prix, disponibilités, places restantes ou dates, tu dois EXCLUSIVEMENT te baser sur la section "OFFRES ACTUELLES EN TEMPS RÉEL" ci-dessous. NE JAMAIS inventer de stock ou de prix. Si une information n'est pas dans cette section, dis que tu n'as pas l'information en temps réel et invite l'utilisateur à consulter la page Destinations ou à faire une demande de devis.`;

  let roleSpecificPrompt = "";
  
  if (userRole === "visitor") {
    roleSpecificPrompt = `
Rôle actuel : Tu es un Commercial Accueillant pour les visiteurs non connectés.
- Explique les concepts, les destinations, les types de séjours
- Incite à l'inscription ("Allez, rejoignez la tribu des cavaliers d'An Arwen !")
- Parle des destinations avec enthousiasme
- Tu peux donner les fourchettes de prix visibles dans les offres actuelles
- Guide vers la création de compte ou la demande de devis`;
  } else if (userRole === "admin") {
    roleSpecificPrompt = `
Rôle actuel : Tu es un Assistant Technique pour les administrateurs.
- Aide à naviguer dans le back-office Control Tower
- Explique comment ajouter un stock, une activité, un créneau
- Guide sur la modération des commentaires et avis
- Aide à comprendre les statistiques et insights clients
- Donne des conseils sur la gestion des devis et factures
- Tu as accès aux données de stock en temps réel pour aider l'admin
${userName ? `\nL'administrateur s'appelle ${userName}.` : ""}`;
  } else {
    roleSpecificPrompt = `
Rôle actuel : Tu es un Support Client pour les cavaliers connectés.
- Aide à trouver les factures et devis dans l'espace personnel
- Explique le processus de réservation et de paiement
- Rassure sur le niveau équestre requis pour chaque randonnée
- Guide dans la préparation du voyage (équipement, documents)
- Réponds aux questions sur les destinations et activités avec les données en temps réel
${userName ? `\nLe client s'appelle ${userName}.` : ""}`;
  }

  return `${basePersona}
${roleSpecificPrompt}

${APP_KNOWLEDGE}

### OFFRES ACTUELLES EN TEMPS RÉEL (Données live de la base de données) :

${liveOffers}

---
Rappel : Ces offres sont mises à jour en temps réel. Utilise UNIQUEMENT ces données pour répondre aux questions sur les disponibilités et les prix.`;
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Loïc receiving question from ${userRole}: ${question.substring(0, 100)}...`);

    // STEP 1: Fetch live data from database
    let liveOffers = "Données non disponibles pour le moment.";
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch active activities
        const { data: activities, error: activitiesError } = await supabaseAdmin
          .from("activities")
          .select("id, title, activity_type, duration, price_from, price_to, region, country, riding_level, max_participants, short_description")
          .eq("is_active", true)
          .order("is_featured", { ascending: false });

        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
        }

        // Fetch activity slots for availability
        const { data: slots, error: slotsError } = await supabaseAdmin
          .from("activity_slots")
          .select("id, activity_id, start_date, end_date, price, max_participants, current_participants, is_available")
          .gte("start_date", new Date().toISOString().split("T")[0])
          .order("start_date", { ascending: true });

        if (slotsError) {
          console.error("Error fetching slots:", slotsError);
        }

        // STEP 2: Format data for AI context
        if (activities && activities.length > 0) {
          liveOffers = formatLiveOffers(activities, slots || []);
          console.log(`Injected ${activities.length} activities and ${slots?.length || 0} slots into context`);
        }
      } catch (dbError) {
        console.error("Database fetch error:", dbError);
      }
    }

    // STEP 3: Build system prompt with live data
    const systemPrompt = getSystemPrompt(userRole, userName, liveOffers);

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: question }
    ];

    // Appel avec streaming désactivé pour éviter les problèmes de parsing SSE dans Deno
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false, // SOLUTION CRITIQUE : Désactive le SSE pour éviter les artefacts de streaming
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    // Gestion défensive de la réponse brute
    const rawText = await response.text();

    // Vérification du statut HTTP avant parsing
    if (!response.ok) {
      console.error(`Erreur API IA (${response.status}):`, rawText);
      
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
      
      return new Response(
        JSON.stringify({ error: "Loïc a un petit souci technique...", details: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsing sécurisé avec nettoyage préventif
    let data;
    try {
      // Supprime les espaces blancs ou sauts de ligne parasites
      const cleanText = rawText.trim();
      
      // Barrière de sécurité : si un artefact SSE persiste, lever une erreur explicite
      if (cleanText.startsWith(":")) {
        throw new Error("Format SSE détecté malgré la désactivation du stream.");
      }
      
      data = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Échec du parsing JSON:", parseError);
      console.error("Contenu reçu (500 premiers caractères):", rawText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Réponse invalide du fournisseur d'IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extraction de la réponse de l'IA
    const aiContent = data.choices?.[0]?.message?.content || "Demat ! Je n'ai pas pu formuler une réponse.";
    
    console.log(`Loïc responded successfully (${aiContent.length} chars)`);

    // Retour de la réponse normalisée
    return new Response(
      JSON.stringify({ 
        response: aiContent,
        model: data.model,
        usage: data.usage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ask-loic error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
