import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import {
  EMAIL_SENDERS,
  wrapInBrandedLayout,
  getAppUrl,
  greeting,
  paragraph,
} from "../_shared/email-templates.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

/**
 * Auth Hook – Send Email
 * Intercepts all auth emails (signup OTP, recovery, magic link, email change, invite)
 * and sends them via Brevo API instead of the default SMTP.
 */

interface EmailHookPayload {
  user: {
    email: string;
    user_metadata?: {
      first_name?: string;
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// Email content per action type
function getEmailContent(
  actionType: string,
  token: string,
  firstName: string,
  appUrl: string,
): { subject: string; body: string; preheader: string } {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirmez votre inscription – An Arwen",
        preheader: `Votre code de vérification : ${token}`,
        body: [
          greeting(firstName),
          paragraph("Bienvenue dans l'univers de la Ferme Équestre An Arwen ! 🐴"),
          paragraph("Pour activer votre compte, veuillez saisir le code de vérification ci-dessous :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#6B8E7F,#5A7A6D);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>. Si vous n'avez pas demandé cette inscription, ignorez cet email."),
          paragraph("Une fois votre compte activé, vous pourrez compléter votre profil cavalier et découvrir nos séjours équestres en Bretagne et à l'étranger."),
        ].join(""),
      };

    case "recovery":
      return {
        subject: "Réinitialisation de votre mot de passe – An Arwen",
        preheader: `Votre code de réinitialisation : ${token}`,
        body: [
          greeting(firstName),
          paragraph("Vous avez demandé la réinitialisation de votre mot de passe."),
          paragraph("Voici votre code de vérification :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#8B7D6B,#6B5D4B);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe restera inchangé."),
        ].join(""),
      };

    case "magiclink":
      return {
        subject: "Votre lien de connexion – An Arwen",
        preheader: `Votre code de connexion : ${token}`,
        body: [
          greeting(firstName),
          paragraph("Voici votre code de connexion sécurisé :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#6B8E7F,#5A7A6D);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>."),
        ].join(""),
      };

    case "email_change":
      return {
        subject: "Confirmez votre nouvelle adresse email – An Arwen",
        preheader: `Votre code de confirmation : ${token}`,
        body: [
          greeting(firstName),
          paragraph("Vous avez demandé le changement de votre adresse email."),
          paragraph("Voici votre code de confirmation :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#C9B896,#A89876);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>."),
        ].join(""),
      };

    case "invite":
      return {
        subject: "Vous êtes invité(e) – Ferme Équestre An Arwen",
        preheader: "Rejoignez l'aventure équestre An Arwen !",
        body: [
          greeting(firstName),
          paragraph("Vous avez été invité(e) à rejoindre la Ferme Équestre An Arwen ! 🌿"),
          paragraph("Voici votre code d'activation :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#6B8E7F,#5A7A6D);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>."),
        ].join(""),
      };

    default:
      return {
        subject: "Notification – Ferme Équestre An Arwen",
        preheader: `Code de vérification : ${token}`,
        body: [
          greeting(firstName),
          paragraph("Voici votre code de vérification :"),
          `<table role="presentation" style="width:100%;margin:25px 0;">
            <tr><td align="center">
              <div style="display:inline-block;background:linear-gradient(135deg,#6B8E7F,#5A7A6D);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px 40px;border-radius:12px;font-family:'Courier New',monospace;">
                ${token}
              </div>
            </td></tr>
          </table>`,
          paragraph("Ce code est valable <strong>60 minutes</strong>."),
        ].join(""),
      };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify webhook signature
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (hookSecret) {
      const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));
      const payload = await req.text();
      const headers = Object.fromEntries(req.headers);
      
      try {
        wh.verify(payload, headers);
      } catch (verifyErr) {
        console.error("[custom-email-sender] Webhook verification failed:", verifyErr);
        return new Response(
          JSON.stringify({ error: "Webhook verification failed" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Parse the verified payload
      const hookPayload: EmailHookPayload = JSON.parse(payload);
      return await processEmail(hookPayload);
    } else {
      // No secret configured – parse body directly (dev/fallback mode)
      const hookPayload: EmailHookPayload = await req.json();
      return await processEmail(hookPayload);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[custom-email-sender] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

async function processEmail(hookPayload: EmailHookPayload): Promise<Response> {
  const { user, email_data } = hookPayload;
  const email = user.email;
  const actionType = email_data.email_action_type;
  const token = email_data.token || "";

  console.log(`[custom-email-sender] Processing ${actionType} for ${email}`);

  // Determine first name
  const firstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.user_metadata?.name?.split(" ")[0] ||
    "Cavalier";

  const appUrl = getAppUrl();
  const { subject, body, preheader } = getEmailContent(actionType, token, firstName, appUrl);

  // Wrap in branded layout
  const htmlContent = wrapInBrandedLayout(
    actionType === "signup"
      ? "Confirmation d'inscription"
      : actionType === "recovery"
      ? "Réinitialisation du mot de passe"
      : actionType === "email_change"
      ? "Changement d'adresse email"
      : "Vérification",
    body,
    {
      preheader,
      ctaUrl: `${appUrl}/auth`,
      ctaLabel: "Accéder à mon compte",
    }
  );

  // Send via Brevo API
  const sender = EMAIL_SENDERS.notifications;
  
  const brevoPayload = {
    sender: { name: sender.name, email: sender.email },
    to: [{ email, name: firstName }],
    subject,
    htmlContent,
    headers: {
      "X-Mailin-Tag": `auth-${actionType}`,
    },
  };

  console.log(`[custom-email-sender] Sending via Brevo: ${actionType} to ${email}`);
  console.log(`[custom-email-sender] Sender: ${sender.name} <${sender.email}>`);

  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
      Accept: "application/json",
    },
    body: JSON.stringify(brevoPayload),
  });

  const brevoBody = await brevoRes.text();

  if (!brevoRes.ok) {
    console.error(`[custom-email-sender] Brevo error ${brevoRes.status}:`, brevoBody);
    return new Response(
      JSON.stringify({ error: `Brevo API error: ${brevoRes.status} - ${brevoBody}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[custom-email-sender] ✅ Email sent successfully: ${actionType} → ${email}`);
  console.log(`[custom-email-sender] Brevo response:`, brevoBody);

  // Return success – Supabase Auth expects an empty response or specific format
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

serve(handler);
