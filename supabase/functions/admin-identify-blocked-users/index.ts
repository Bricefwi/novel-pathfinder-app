import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return createAuthErrorResponse("Authentication required", 401, corsHeaders);
    }

    if (!(await verifyAdminRole(auth.supabase, auth.user.id))) {
      return createAuthErrorResponse("Admin access required", 403, corsHeaders);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // List all users via admin API (paginated)
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      if (!users || users.length === 0) break;
      allUsers.push(...users);
      if (users.length < perPage) break;
      page++;
    }

    // Fetch profiles
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, onboarding_completed");

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    );

    // Identify blocked users
    const blockedUsers = allUsers
      .map((u) => {
        const profile = profileMap.get(u.id);
        
        let statut = "ACTIF";
        const hasNoPassword = !u.encrypted_password || u.encrypted_password === "";
        const emailNotConfirmed = !u.email_confirmed_at;
        const neverSignedIn = !u.last_sign_in_at;
        const wasInvited = !!u.invited_at;

        if (emailNotConfirmed && neverSignedIn) {
          statut = "JAMAIS_CONNECTÉ_NON_CONFIRMÉ";
        } else if (emailNotConfirmed && !neverSignedIn) {
          statut = "CONNECTÉ_MAIS_NON_CONFIRMÉ";
        } else if (hasNoPassword) {
          statut = "SANS_MOT_DE_PASSE";
        } else if (wasInvited && neverSignedIn) {
          statut = "INVITÉ_JAMAIS_CONNECTÉ";
        }

        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          email_confirmed_at: u.email_confirmed_at,
          last_sign_in_at: u.last_sign_in_at,
          invited_at: u.invited_at,
          confirmation_sent_at: u.confirmation_sent_at,
          statut_compte: statut,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          onboarding_completed: profile?.onboarding_completed || false,
        };
      })
      .filter((u) => u.statut_compte !== "ACTIF");

    // Log to audit
    await supabaseAdmin.from("security_audit_log").insert({
      action_type: "ACCOUNT_HEALTH_DIAGNOSTIC",
      performed_by: auth.user.id,
      metadata: {
        total_users: allUsers.length,
        blocked_count: blockedUsers.length,
        statuses: blockedUsers.reduce((acc: Record<string, number>, u) => {
          acc[u.statut_compte] = (acc[u.statut_compte] || 0) + 1;
          return acc;
        }, {}),
      },
    });

    return new Response(
      JSON.stringify({
        total_users: allUsers.length,
        blocked_count: blockedUsers.length,
        active_count: allUsers.length - blockedUsers.length,
        blocked_users: blockedUsers,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[admin-identify-blocked-users] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
