// Supabase Edge Function: verify-payment
// Deploy using: supabase functions deploy verify-payment
// Set secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, number> = {
  starter: 2000,
  growth: 5000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, planId, vendorId, isRenewal } = await req.json();

    if (!reference || !planId || !vendorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "PAYSTACK_SECRET_KEY is not configured on Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify with Paystack API
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecret.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const body = await paystackRes.json();
    if (!paystackRes.ok || !body.status || body.data?.status !== "success") {
      return new Response(
        JSON.stringify({ success: false, error: body.message || "Paystack transaction verification failed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payData = body.data;
    const expectedAmountKobo = (PLAN_PRICES[planId] || 2000) * 100;
    if (payData.amount < expectedAmountKobo) {
      return new Response(
        JSON.stringify({ success: false, error: "Paid amount is less than expected plan amount." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Connect to Supabase using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call atomic RPC
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("process_paystack_activation", {
      p_reference: reference,
      p_vendor_id: vendorId,
      p_plan_id: planId,
      p_amount: payData.amount / 100,
      p_channel: payData.channel || "card",
      p_customer_email: payData.customer?.email,
      p_paystack_data: payData,
      p_is_renewal: Boolean(isRenewal),
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Subscription activated successfully!", data: rpcData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
