import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { first_name, last_name, email, phone, riding_level } = await req.json();

    if (!first_name) {
      return new Response(JSON.stringify({ error: "Le prénom est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create a dummy auth user so user_id is valid in auth.users
    const tempPassword = crypto.randomUUID();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email || `manual-${crypto.randomUUID()}@placeholder.local`,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name, last_name, manual_client: true },
    });

    if (authError) {
      console.error("[create-manual-client] Auth error:", authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Upsert the profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        first_name,
        last_name,
        phone: phone || null,
        riding_level: riding_level || "debutant",
        onboarding_completed: true,
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("[create-manual-client] Profile error:", profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[create-manual-client] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
