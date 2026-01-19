import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Vérifie si l'utilisateur a le rôle admin
 * @param supabase Client Supabase authentifié
 * @param userId ID de l'utilisateur
 * @returns true si l'utilisateur est admin
 */
export async function verifyAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: roleData, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  if (error || !roleData) {
    return false;
  }

  return roleData.role === "admin";
}

/**
 * Vérifie si l'utilisateur est propriétaire d'une ressource ou admin
 * @param supabase Client Supabase authentifié
 * @param userId ID de l'utilisateur courant
 * @param resourceUserId ID de l'utilisateur propriétaire de la ressource
 * @returns true si l'utilisateur peut accéder
 */
export async function verifyOwnershipOrAdmin(
  supabase: SupabaseClient,
  userId: string,
  resourceUserId: string
): Promise<boolean> {
  // Propriétaire direct
  if (userId === resourceUserId) {
    return true;
  }

  // Sinon, vérifier si admin
  return await verifyAdminRole(supabase, userId);
}

/**
 * Extrait et vérifie le token d'authentification
 * @param req Request HTTP
 * @returns Objet avec le client Supabase et les infos utilisateur
 */
export async function authenticateRequest(req: Request): Promise<{
  supabase: SupabaseClient;
  user: { id: string; email: string | undefined };
} | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    return null;
  }

  return {
    supabase,
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
  };
}

/**
 * Crée une réponse d'erreur d'authentification
 */
export function createAuthErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
