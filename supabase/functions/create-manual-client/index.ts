import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, verifyAdminRole, createAuthErrorResponse } from "../_shared/rbac.ts";
import {
  EMAIL_SENDERS, wrapInBrandedLayout, getAppUrl,
  paragraph, separator, greeting, infoCard,
} from "../_shared/email-templates.ts";
import { sendEmailWithAudit } from "../_shared/email-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_COPY_EMAIL = "patrice.simion@gmail.com";

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

    const siteUrl = Deno.env.get("SITE_URL") || "https://ferme-equestre-arwen.com";
    const clientEmail = email || `manual-${crypto.randomUUID()}@placeholder.local`;
    const isRealEmail = email && !email.includes("@placeholder.local");

    let userId: string;
    let method: string;

    if (isRealEmail) {
      // Use inviteUserByEmail for real emails — sends an invitation link
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        clientEmail,
        {
          data: { first_name, last_name, manual_client: true },
          redirectTo: `${siteUrl}/auth?reset=true`,
        }
      );

      if (inviteError) {
        // If user already exists, just get their ID and update profile
        if (inviteError.message.includes("already been registered") || inviteError.message.includes("already exists")) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users?.find((u) => u.email === clientEmail);
          if (!existingUser) {
            return new Response(JSON.stringify({ error: "Utilisateur existant non trouvé" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          userId = existingUser.id;
          method = "existing_user_updated";
        } else {
          console.error("[create-manual-client] Invite error:", inviteError);
          return new Response(JSON.stringify({ error: inviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = inviteData.user.id;
        method = "invited";
      }
    } else {
      // For placeholder emails, use createUser (no real invitation needed)
      const tempPassword = crypto.randomUUID();
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: clientEmail,
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
      userId = authData.user.id;
      method = "created_placeholder";
    }

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

    // ── Send welcome email (only for real emails that were NOT invited) ──
    // For invited users, Supabase already sends the invitation email
    let emailSent = false;
    const isRealEmailForWelcome = isRealEmail && method !== "invited";

    if (isRealEmailForWelcome) {
      const appUrl = getAppUrl();
      const displayName = first_name || "cher cavalier";
      const levelLabels: Record<string, string> = {
        debutant: "Débutant",
        intermediaire: "Intermédiaire",
        confirme: "Confirmé",
        expert: "Expert",
      };

      const bodyContent = [
        greeting(displayName),
        `<div style="text-align:center;padding:15px 0 25px 0;">
          <p style="font-size:48px;margin:0;line-height:1;">🐴</p>
          <h2 style="margin:12px 0 5px 0;color:#6B8E7F;font-family:Georgia,serif;font-size:24px;letter-spacing:0.5px;">
            Bienvenue dans la famille An Arwen !
          </h2>
          <p style="margin:0;color:#8B7D6B;font-size:14px;font-style:italic;">Votre aventure équestre commence aujourd'hui</p>
        </div>`,
        paragraph("Nous sommes ravis de vous compter parmi nos cavaliers ! Notre équipe a personnellement créé votre espace pour vous offrir la meilleure expérience possible. 🌿"),
        separator(),
        infoCard(`
          <h3 style="margin:0 0 12px 0;font-family:Georgia,serif;color:#333;font-size:16px;">📋 Votre fiche cavalier</h3>
          <table role="presentation" style="width:100%;font-size:14px;color:#555;">
            <tr><td style="padding:4px 0;font-weight:600;width:120px;">Nom</td><td>${first_name} ${last_name || ""}</td></tr>
            ${phone ? `<tr><td style="padding:4px 0;font-weight:600;">Téléphone</td><td>${phone}</td></tr>` : ""}
            <tr><td style="padding:4px 0;font-weight:600;">Niveau</td><td>${levelLabels[riding_level] || riding_level || "Débutant"}</td></tr>
          </table>
        `),
        `<div style="background:#F5F3F0;padding:20px;border-radius:12px;margin:20px 0;">
          <h3 style="margin:0 0 15px 0;font-family:Georgia,serif;color:#333;font-size:16px;">🗺️ Que faire maintenant ?</h3>
          <p style="margin:6px 0;font-size:14px;color:#555;">🌍 <strong>Découvrez nos destinations</strong> – Bretagne, Maroc et bien d'autres…</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">📝 <strong>Demandez un devis personnalisé</strong> – Adapté à votre niveau et vos envies</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">🏡 <strong>Séjournez dans notre yourte</strong> – Une expérience unique au cœur de la Bretagne</p>
          <p style="margin:6px 0;font-size:14px;color:#555;">📰 <strong>Inscrivez-vous à la newsletter</strong> – Bons plans et prochaines randonnées</p>
        </div>`,
        separator(),
        paragraph("N'hésitez pas à nous contacter pour toute question, nous sommes là pour vous accompagner dans votre passion équestre ! 🐎"),
        paragraph("À très bientôt en selle,<br><strong>Loïc & l'équipe An Arwen</strong> 🌿"),
      ].join("");

      const htmlContent = wrapInBrandedLayout("Bienvenue chez An Arwen ! 🐴", bodyContent, {
        preheader: `Bienvenue ${displayName} ! Votre espace cavalier est prêt – découvrez nos randonnées`,
        ctaUrl: `${appUrl}/destinations`,
        ctaLabel: "Découvrir nos aventures 🌍",
      });

      const sender = EMAIL_SENDERS.contact;
      const subject = `🐴 Bienvenue ${displayName} – Votre aventure An Arwen commence !`;

      // Send to client
      const result = await sendEmailWithAudit({
        supabase: supabaseAdmin,
        to: email,
        from: `${sender.name} <${sender.email}>`,
        subject,
        html: htmlContent,
        type: "notification",
        userId,
      });

      emailSent = result.success;

      if (!result.success) {
        console.error("[create-manual-client] Welcome email failed:", result.error);
      }

      // Send copy to admin
      if (ADMIN_COPY_EMAIL) {
        await sendEmailWithAudit({
          supabase: supabaseAdmin,
          to: ADMIN_COPY_EMAIL,
          from: `${EMAIL_SENDERS.notifications.name} <${EMAIL_SENDERS.notifications.email}>`,
          subject: `[COPIE] ${subject}`,
          html: htmlContent,
          type: "alert",
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      method,
      welcome_email_sent: emailSent,
      invitation_sent: method === "invited",
    }), {
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
