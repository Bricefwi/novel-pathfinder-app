// Liste blanche des origines autorisées
export const ALLOWED_ORIGINS = [
  "https://www.ferme-equestre-an-arwen.com",
  "https://ferme-equestre-an-arwen.com",
  "https://novel-pathfinder-app.lovable.app",
  "https://id-preview--2d082c2e-ad18-4f64-b0a5-29ecd0fc2459.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

/**
 * Génère les headers CORS sécurisés
 * @param origin L'origine de la requête
 * @returns Headers CORS appropriés
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    !!origin &&
    ALLOWED_ORIGINS.some(
      (allowed) =>
        origin === allowed ||
        // Autoriser les environnements de prévisualisation Lovable
        origin.includes("lovable.app") ||
        // Autoriser le domaine de preview interne (utilisé notamment par le dev server)
        origin.includes("lovableproject.com")
    );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    // IMPORTANT: doit inclure tous les headers envoyés par le client (notamment via supabase-js)
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

/**
 * Gère les requêtes preflight OPTIONS
 * @param origin L'origine de la requête
 * @returns Response pour OPTIONS
 */
export function handleCorsPreflightRequest(origin: string | null): Response {
  return new Response("ok", {
    headers: getCorsHeaders(origin),
  });
}
