import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SENDERS } from "../_shared/email-templates.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (roleError || !roles) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
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

        const sender = EMAIL_SENDERS.notifications;
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
          body: JSON.stringify({
            sender: { name: sender.name, email: sender.email },
            to: [{ email: adminEmail || user.email }],
            subject: "🔧 Test Système – Email Fonctionnel",
            htmlContent: `
              <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;">
                <div style="background:linear-gradient(135deg,#6B8E7F 0%,#8B7D6B 100%);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                  <h1 style="color:#fff;margin:0;font-family:Georgia,serif;">✅ Test Réussi</h1>
                </div>
                <div style="padding:30px;background:#fff;border:1px solid #EDEBE8;border-top:none;border-radius:0 0 12px 12px;">
                  <p style="color:#555;font-size:15px;line-height:1.6;">Ce message confirme que le système d'envoi d'emails fonctionne correctement via Brevo.</p>
                  <table role="presentation" style="width:100%;background:#F5F3F0;border-radius:8px;margin:20px 0;">
                    <tr><td style="padding:15px;">
                      <p style="margin:0 0 5px 0;font-size:13px;color:#888;">Date du test</p>
                      <p style="margin:0;font-size:14px;color:#333;">${new Date().toLocaleString("fr-FR")}</p>
                    </td></tr>
                    <tr><td style="padding:0 15px 15px 15px;">
                      <p style="margin:0 0 5px 0;font-size:13px;color:#888;">Utilisateur</p>
                      <p style="margin:0;font-size:14px;color:#333;">${user.email}</p>
                    </td></tr>
                  </table>
                </div>
                <p style="color:#999;font-size:11px;text-align:center;margin:15px 0;">System Diagnostics – Ferme Équestre An Arwen</p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          const emailResponse = await res.json();
          result = { success: true, data: emailResponse, message: "Email envoyé avec succès" };
        } else {
          result = { success: false, error: await res.text() };
        }
        break;
      }

      case "database": {
        const startTime = performance.now();
        const { count, error: dbError } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        result = dbError
          ? { success: false, error: dbError.message }
          : { success: true, data: { count, responseTime }, message: `Connecté en ${responseTime}ms - ${count} profils en base` };
        break;
      }

      case "storage": {
        const testFileName = `test-diagnostic-${Date.now()}.png`;
        const pngBytes = new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
          0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
          0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
          0x0D, 0x0A, 0x2D, 0xB4,
          0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
          0xAE, 0x42, 0x60, 0x82
        ]);
        const { error: uploadError } = await supabase.storage.from("avatars").upload(`test/${testFileName}`, pngBytes, { contentType: "image/png", upsert: true });
        if (uploadError) { result = { success: false, error: `Upload failed: ${uploadError.message}` }; break; }
        const { error: downloadError } = await supabase.storage.from("avatars").download(`test/${testFileName}`);
        if (downloadError) { result = { success: false, error: `Download failed: ${downloadError.message}` }; break; }
        const { error: deleteError } = await supabase.storage.from("avatars").remove([`test/${testFileName}`]);
        result = deleteError
          ? { success: true, message: "Upload/Download OK, suppression échouée (non bloquant)", warning: deleteError.message }
          : { success: true, message: "Écriture/Lecture/Suppression OK" };
        break;
      }

      case "ai": {
        const startTime = performance.now();
        const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ask-loic`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": authHeader },
          body: JSON.stringify({ question: "Ping système - réponds brièvement que tu es opérationnel", userRole: "admin" }),
        });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          result = { success: true, data: { response: aiData.response, responseTime }, message: `IA opérationnelle (${responseTime}ms)` };
        } else {
          result = { success: false, error: await aiResponse.text() };
        }
        break;
      }

      case "integrity": {
        const anomalies: string[] = [];
        const { count: orphanQuotes } = await supabase.from("quotes").select("*", { count: "exact", head: true }).is("user_id", null);
        if (orphanQuotes && orphanQuotes > 0) anomalies.push(`${orphanQuotes} devis sans utilisateur associé`);
        const { count: noPriceActivities } = await supabase.from("activities").select("*", { count: "exact", head: true }).is("price_from", null);
        if (noPriceActivities && noPriceActivities > 0) anomalies.push(`${noPriceActivities} activités sans prix défini`);
        const { count: incompleteProfiles } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", false);
        if (incompleteProfiles !== null) anomalies.push(`${incompleteProfiles} profils avec onboarding incomplet`);
        const { count: orphanInvoices } = await supabase.from("invoices").select("*", { count: "exact", head: true }).is("quote_id", null);
        if (orphanInvoices && orphanInvoices > 0) anomalies.push(`${orphanInvoices} factures sans devis associé`);
        result = { success: true, data: { anomalies, count: anomalies.length }, message: anomalies.length === 0 ? "Aucune anomalie détectée" : `${anomalies.length} anomalie(s) détectée(s)` };
        break;
      }

      default:
        result = { success: false, error: "Unknown test type" };
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("[test-system] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
