import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Validation schema for attachments
const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1), // base64 content
  contentType: z.string().min(1).max(255),
});

// Validation schema for request body
const emailRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1).max(200, "Subject must be 200 characters or less"),
  message: z.string().min(1).max(10000, "Message must be 10000 characters or less"),
  customerName: z.string().optional(),
  attachments: z.array(attachmentSchema).max(5, "Maximum 5 attachments allowed").optional(),
});

const ALLOWED_EXACT_ORIGINS = [
  "https://sub-scribe-love.lovable.app",
];

const ALLOWED_ORIGIN_SUFFIXES = [
  ".lovable.app",
  ".lovableproject.com",
];

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_EXACT_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some(suffix => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  if (!isOriginAllowed(origin)) {
    return null;
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

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
    .replace(/[\r\n]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 200);
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

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user ${userId} sending single email`);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const validationResult = emailRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, subject, message, customerName, attachments } = validationResult.data;

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's settings (app name and reply-to email)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('reply_to_email, app_name')
      .eq('user_id', userId)
      .maybeSingle();

    const replyToEmail = settings?.reply_to_email || null;
    const fromName = settings?.app_name || "Let's Stream";

    // Build HTML email
    const escapedMessage = message.split('\n').map(line => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${escapedMessage}
      </div>
    `;

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: `${fromName} <noreply@letsstreamtracker.ca>`,
      to: [email],
      subject: sanitizeEmailSubject(subject),
      html,
    };

    if (replyToEmail) {
      emailPayload.reply_to = replyToEmail;
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
      }));
    }

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email sent successfully to ${email} with ${attachments?.length || 0} attachment(s)`);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-single-email:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
