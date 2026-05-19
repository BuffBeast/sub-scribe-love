import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const fallbackBrevoKey = Deno.env.get("BREVO_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const userId = claims.claims.sub as string;

    // Look up the calling user's Brevo API key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('brevo_api_key')
      .eq('user_id', userId)
      .maybeSingle();

    const brevoKey = (settings as any)?.brevo_api_key || fallbackBrevoKey;

    if (!brevoKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Brevo API key is not configured. Add your Brevo API key in Email settings first.",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Call Brevo /account directly with the user's API key
    const resp = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": brevoKey,
        "Accept": "application/json",
      },
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: resp.status,
          error: data?.message || data?.error || "Failed to verify Brevo credentials",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        account: {
          email: data?.email ?? null,
          firstName: data?.firstName ?? null,
          lastName: data?.lastName ?? null,
          companyName: data?.companyName ?? null,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("test-brevo-connection error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
