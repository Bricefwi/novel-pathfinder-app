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

    const { emails, resend_all } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const siteUrl = Deno.env.get("SITE_URL") || "https://ferme-equestre-arwen.com";

    let targetEmails: string[] = [];

    if (resend_all) {
      // Get all blocked users
      const allUsers: any[] = [];
      let page = 1;
      while (true) {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        if (!users || users.length === 0) break;
        allUsers.push(...users);
        if (users.length < 1000) break;
        page++;
      }

      targetEmails = allUsers
        .filter((u) => {
          const emailNotConfirmed = !u.email_confirmed_at;
          const neverSignedIn = !u.last_sign_in_at;
          const hasNoPassword = !u.encrypted_password || u.encrypted_password === "";
          return (emailNotConfirmed && neverSignedIn) || hasNoPassword || (u.invited_at && neverSignedIn);
        })
        .map((u) => u.email)
        .filter((e): e is string => !!e && !e.includes("@placeholder.local"));
    } else if (Array.isArray(emails) && emails.length > 0) {
      targetEmails = emails.filter((e: string) => e && !e.includes("@placeholder.local"));
    } else {
      return new Response(
        JSON.stringify({ error: "Fournissez 'emails' (array) ou 'resend_all: true'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: max 10 per call
    if (targetEmails.length > 10) {
      targetEmails = targetEmails.slice(0, 10);
    }

    const results = { success: [] as string[], failed: [] as { email: string; error: string }[], total_processed: 0 };

    for (const email of targetEmails) {
      try {
        // First confirm the user's email if not confirmed
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.find((u) => u.email === email);
        
        if (user) {
          // Confirm email first
          if (!user.email_confirmed_at) {
            await supabaseAdmin.auth.admin.updateUser(user.id, {
              email_confirm: true,
            });
          }

          // Generate a password reset link (this acts as an invitation to set password)
          const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: `${siteUrl}/auth?reset=true`,
            },
          });

          if (error) throw error;

          // Send the reset email via Supabase's built-in mechanism
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/auth?reset=true`,
          });

          if (resetError) throw resetError;

          results.success.push(email);
        } else {
          results.failed.push({ email, error: "Utilisateur non trouvé" });
        }
      } catch (err: any) {
        results.failed.push({ email, error: err.message });
      }
      results.total_processed++;
    }

    // Log action
    await supabaseAdmin.from("security_audit_log").insert({
      action_type: "BULK_REINVITATION",
      performed_by: auth.user.id,
      metadata: {
        success_count: results.success.length,
        failed_count: results.failed.length,
        emails_processed: results.success,
      },
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[admin-resend-invitations] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
