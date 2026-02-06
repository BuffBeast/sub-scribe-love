import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HTML escape function to prevent XSS in emails
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Sanitize email subject to prevent header injection attacks
function sanitizeEmailSubject(subject: string): string {
  return subject
    .replace(/[\r\n]/g, '') // Remove newlines to prevent header injection
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 200); // Limit length
}

interface MassEmailRequest {
  subject: string;
  message: string;
  customerIds?: string[]; // Optional: send to specific customers, otherwise all with email
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string | null) {
  const emailPayload: Record<string, unknown> = {
    from: "Announcement <noreply@yourdomain.com>", // Update with your verified domain
    to: [to],
    subject,
    html,
  };

  if (replyTo) {
    emailPayload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });
  return response.json();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with anon key to verify the user's token
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user ${userId} triggered send-mass-email`);

    // Parse request body
    const body: MassEmailRequest = await req.json();
    const { subject, message, customerIds } = body;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query for customers with emails belonging to this user
    let query = supabase
      .from('customers')
      .select('id, name, email, subscription_plan')
      .eq('user_id', userId)
      .not('email', 'is', null);

    // If specific customer IDs provided, filter to those
    if (customerIds && customerIds.length > 0) {
      query = query.in('id', customerIds);
    }

    const { data: customers, error } = await query;

    if (error) throw error;

    console.log(`Sending mass email to ${customers?.length || 0} customers`);

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No customers with email addresses found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user's reply-to setting
    let replyToEmail: string | null = null;
    const { data: settings } = await supabase
      .from('app_settings')
      .select('reply_to_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings?.reply_to_email) {
      replyToEmail = settings.reply_to_email;
    }

    const sanitizedSubject = sanitizeEmailSubject(subject);
    const emailResults = [];
    let successCount = 0;
    let failCount = 0;

    for (const customer of customers) {
      if (!customer.email) continue;

      // Replace placeholders with escaped values
      const escapedName = escapeHtml(customer.name);
      const escapedPlan = escapeHtml(customer.subscription_plan || 'N/A');
      
      const personalizedMessage = message
        .replace(/\{name\}/g, escapedName)
        .replace(/\{plan\}/g, escapedPlan);

      // Build HTML email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${personalizedMessage.split('\n').map(line => `<p style="margin: 0 0 10px 0;">${escapeHtml(line) || '&nbsp;'}</p>`).join('')}
        </div>
      `;

      try {
        const result = await sendEmail(customer.email, sanitizedSubject, html, replyToEmail);
        if (result.error) {
          emailResults.push({ email: customer.email, success: false, error: result.error.message || result.error });
          failCount++;
        } else {
          emailResults.push({ email: customer.email, success: true });
          successCount++;
        }
      } catch (e) {
        emailResults.push({ email: customer.email, success: false, error: String(e) });
        failCount++;
      }

      // Small delay to avoid rate limiting (Resend allows 10 emails/second on free tier)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(
      JSON.stringify({ 
        total: customers.length,
        success: successCount,
        failed: failCount,
        results: emailResults 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
