import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * create-checkout-session
 * 
 * Called by admin to generate a Stripe Checkout payment link for a quote or invoice.
 * Supports: full payment or deposit (acompte).
 * The link is then sent to the client by email.
 */

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Auth check - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const {
      invoice_id,
      quote_id,
      client_name,
      client_email,
      activity_title,
      amount, // in EUR (e.g. 450.00)
      payment_type = "full", // "full" or "deposit"
      deposit_percentage,
    } = body;

    if (!client_email || !activity_title || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields: client_email, activity_title, amount" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate actual amount to charge
    const chargeAmount = payment_type === "deposit" && deposit_percentage
      ? Math.ceil(amount * (deposit_percentage / 100))
      : amount;

    const amountInCents = Math.round(chargeAmount * 100);

    // Build description
    const description = payment_type === "deposit"
      ? `Acompte ${deposit_percentage}% – ${activity_title}`
      : `Paiement intégral – ${activity_title}`;

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: client_email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build app URL for redirects
    const appUrl = Deno.env.get("APP_URL") || "https://www.ferme-equestre-arwen.com";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: activity_title,
              description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          invoice_id: invoice_id || "",
          quote_id: quote_id || "",
          payment_type,
          client_name: client_name || "",
          client_email,
          activity_title,
          original_amount: String(amount),
          charge_amount: String(chargeAmount),
        },
      },
      metadata: {
        invoice_id: invoice_id || "",
        quote_id: quote_id || "",
        payment_type,
      },
      success_url: `${appUrl}/paiement-confirme?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/paiement-annule`,
    });

    // Save session ID to invoice/quote
    if (invoice_id) {
      await supabase.from("invoices").update({ stripe_session_id: session.id }).eq("id", invoice_id);
    }
    if (quote_id) {
      await supabase.from("quotes").update({ stripe_session_id: session.id }).eq("id", quote_id);
    }

    console.log(`[create-checkout-session] Session created: ${session.id} for ${client_email}, amount: ${chargeAmount}€ (${payment_type})`);

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
      amount: chargeAmount,
      payment_type,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[create-checkout-session] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
