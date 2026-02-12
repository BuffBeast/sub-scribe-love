import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const ALLOWED_ORIGINS = [
  "https://sub-scribe-love.lovable.app",
  "https://id-preview--5885fea3-49d8-471e-834f-5918a0347d87.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return null;
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Validation schema for attachments
const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1), // base64 content
  contentType: z.string().min(1).max(255),
});

// Input validation schema
const massEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be 200 characters or less"),
  message: z.string().min(1, "Message is required").max(10000, "Message must be 10000 characters or less"),
  customerIds: z.array(z.string().uuid("Invalid customer ID format")).max(1000, "Maximum 1000 customers per request").optional(),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed").optional(),
});

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

interface Attachment {
  filename: string;
  content: string;
  contentType: string;
}

interface MassEmailRequest {
  subject: string;
  message: string;
  customerIds?: string[]; // Optional: send to specific customers, otherwise all with email
  attachments?: Attachment[];
}

async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  fromName: string,
  replyTo?: string | null,
  attachments?: Attachment[]
) {
  const emailPayload: Record<string, unknown> = {
    from: `${fromName} <noreply@letsstreamtracker.ca>`,
    to: [to],
    subject,
    html,
  };

  if (replyTo) {
    emailPayload.reply_to = replyTo;
  }

  if (attachments && attachments.length > 0) {
    emailPayload.attachments = attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      type: att.contentType,
    }));
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
  const corsHeaders = getCorsHeaders(req);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
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

    // Parse and validate request body using Zod schema
    let body: MassEmailRequest;
    try {
      const rawBody = await req.json();
      const validationResult = massEmailSchema.safeParse(rawBody);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        return new Response(
          JSON.stringify({ error: `Validation failed: ${errors}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      body = validationResult.data;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { subject, message, customerIds, attachments } = body;

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

    if (error) {
      console.error("Database query failed:", error);
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending mass email to ${customers?.length || 0} customers with ${attachments?.length || 0} attachment(s)`);

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No customers with email addresses found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user's settings (app name and reply-to email)
    let replyToEmail: string | null = null;
    let fromName = "Let's Stream"; // Default fallback
    const { data: settings } = await supabase
      .from('app_settings')
      .select('reply_to_email, app_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings?.reply_to_email) {
      replyToEmail = settings.reply_to_email;
    }
    if (settings?.app_name) {
      fromName = settings.app_name;
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
        const result = await sendEmail(customer.email, sanitizedSubject, html, fromName, replyToEmail, attachments);
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
    console.error("Error in send-mass-email:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
