import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestRequest {
  test: "email" | "database" | "storage" | "ai" | "integrity";
  adminEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check admin role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roles) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { test, adminEmail }: TestRequest = await req.json();
    console.log(`[test-system] Running test: ${test}`);

    let result: any = { success: false };

    switch (test) {
      case "email": {
        if (!BREVO_API_KEY) {
          result = { success: false, error: "BREVO_API_KEY not configured" };
          break;
        }

        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { name: "Ferme Arwen", email: "notifications@ferme-equestre-arwen.com" },
            to: [{ email: adminEmail || user.email }],
            subject: "🔧 Test System - Email Fonctionnel",
            htmlContent: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #6B8E7F;">✅ Test Email Réussi</h1>
                <p>Ce message confirme que le système d'envoi d'emails fonctionne correctement.</p>
                <p><strong>Date du test:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                <p><strong>Utilisateur:</strong> ${user.email}</p>
                <hr style="margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">System Diagnostics - An Arwen</p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          const emailResponse = await res.json();
          result = { success: true, data: emailResponse, message: "Email envoyé avec succès" };
        } else {
          const errorText = await res.text();
          result = { success: false, error: errorText };
        }
        break;
      }

      case "database": {
        const startTime = performance.now();
        const { count, error: dbError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        if (dbError) {
          result = { success: false, error: dbError.message };
        } else {
          result = { 
            success: true, 
            data: { count, responseTime },
            message: `Connecté en ${responseTime}ms - ${count} profils en base`
          };
        }
        break;
      }

      case "storage": {
        const testFileName = `test-diagnostic-${Date.now()}.png`;
        // Create a minimal valid PNG (1x1 transparent pixel)
        const pngBytes = new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
          0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
          0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
          0x0D, 0x0A, 0x2D, 0xB4,
          0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
          0xAE, 0x42, 0x60, 0x82
        ]);
        
        // Upload test file
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`test/${testFileName}`, pngBytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          result = { success: false, error: `Upload failed: ${uploadError.message}` };
          break;
        }

        // Read test file
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from("avatars")
          .download(`test/${testFileName}`);

        if (downloadError) {
          result = { success: false, error: `Download failed: ${downloadError.message}` };
          break;
        }

        // Delete test file
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([`test/${testFileName}`]);

        if (deleteError) {
          result = { 
            success: true, 
            message: "Upload/Download OK, suppression échouée (non bloquant)",
            warning: deleteError.message
          };
        } else {
          result = { 
            success: true, 
            message: "Écriture/Lecture/Suppression OK"
          };
        }
        break;
      }

      case "ai": {
        const startTime = performance.now();
        
        // Call ask-loic function
        const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ask-loic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            question: "Ping système - réponds brièvement que tu es opérationnel",
            userRole: "admin"
          }),
        });

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          result = { 
            success: true, 
            data: { response: aiData.response, responseTime },
            message: `IA opérationnelle (${responseTime}ms)`
          };
        } else {
          const errorText = await aiResponse.text();
          result = { success: false, error: errorText };
        }
        break;
      }

      case "integrity": {
        const anomalies: string[] = [];

        // Check quotes without user_id
        const { count: orphanQuotes, error: quotesError } = await supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .is("user_id", null);

        if (!quotesError && orphanQuotes && orphanQuotes > 0) {
          anomalies.push(`${orphanQuotes} devis sans utilisateur associé`);
        }

        // Check activities without price
        const { count: noPriceActivities, error: activitiesError } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .is("price_from", null);

        if (!activitiesError && noPriceActivities && noPriceActivities > 0) {
          anomalies.push(`${noPriceActivities} activités sans prix défini`);
        }

        // Check profiles without onboarding completed
        const { count: incompleteProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("onboarding_completed", false);

        if (!profilesError && incompleteProfiles !== null) {
          anomalies.push(`${incompleteProfiles} profils avec onboarding incomplet`);
        }

        // Check invoices without quote_id
        const { count: orphanInvoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .is("quote_id", null);

        if (!invoicesError && orphanInvoices && orphanInvoices > 0) {
          anomalies.push(`${orphanInvoices} factures sans devis associé`);
        }

        result = { 
          success: true, 
          data: { anomalies, count: anomalies.length },
          message: anomalies.length === 0 
            ? "Aucune anomalie détectée" 
            : `${anomalies.length} anomalie(s) détectée(s)`
        };
        break;
      }

      default:
        result = { success: false, error: "Unknown test type" };
    }

    console.log(`[test-system] Test ${test} completed:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[test-system] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
