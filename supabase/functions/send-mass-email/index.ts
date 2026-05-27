import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FALLBACK_BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_GATEWAY = "https://api.brevo.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed content types for attachments
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .replace(/[/\\]/g, '_')           // Replace path separators
    .replace(/\.\./g, '_')            // Remove path traversal
    .trim()
    .slice(0, 255);
}

// Validation schema for attachments
const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1), // base64 content
  contentType: z.string().min(1).max(255).refine(
    (ct) => ALLOWED_CONTENT_TYPES.has(ct.toLowerCase()),
    { message: "File type not allowed" }
  ),
}).refine(
  (att) => {
    // Validate base64 decoded size is within limit
    const estimatedBytes = Math.ceil(att.content.length * 3 / 4);
    return estimatedBytes <= MAX_ATTACHMENT_SIZE_BYTES;
  },
  { message: "Attachment exceeds 5MB size limit" }
);

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
  customerIds?: string[];
  attachments?: Attachment[];
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string,
  fromEmail: string,
  brevoApiKey: string,
  replyTo?: string | null,
  attachments?: Attachment[]
) {
  const payload: Record<string, unknown> = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map(att => ({
      name: sanitizeFilename(att.filename),
      content: att.content,
    }));
  }

  const response = await fetch(`${BREVO_GATEWAY}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));
  // Brevo returns { messageId } on success; error fields on failure
  return {
    ok: response.ok,
    json: response.ok ? json : { error: json?.message || json?.code || `HTTP ${response.status}` },
  };
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

    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY");
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
        console.error("Validation failed:", validationResult.error);
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
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

    // Fetch user's settings (Brevo sender, app name, reply-to)
    let replyToEmail: string | null = null;
    let fromName = "Let's Stream";
    let fromEmail: string | null = null;
    const { data: settings } = await supabase
      .from('app_settings')
      .select('reply_to_email, app_name, brevo_sender_email, brevo_sender_name, brevo_api_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings?.reply_to_email) replyToEmail = settings.reply_to_email;
    if (settings?.brevo_sender_name) fromName = settings.brevo_sender_name;
    else if (settings?.app_name) fromName = settings.app_name;
    if (settings?.brevo_sender_email) fromEmail = settings.brevo_sender_email;
    const brevoApiKey = settings?.brevo_api_key || FALLBACK_BREVO_API_KEY;

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "Brevo API key is not configured. Open Email settings to add your Brevo API key." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: "Brevo sender email is not configured. Open Email settings to set it." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitizedSubject = sanitizeEmailSubject(subject);
    const emailResults = [];
    let successCount = 0;
    let failCount = 0;

    // Collect history entries to batch insert
    const historyEntries: Array<{
      user_id: string;
      customer_id: string;
      customer_name: string;
      customer_email: string;
      reminder_type: string;
      plan_description: string;
      status: string;
      error_message: string | null;
    }> = [];

    // Process in parallel chunks to stay under the 150s edge function timeout
    // (sequential 1000 × ~250ms ≈ 250s would time out).
    // 20 in parallel × ~50 chunks (1000 recipients) × ~600ms per chunk ≈ 30s.
    const CHUNK_SIZE = 20;
    const INTER_CHUNK_DELAY_MS = 500;

    const buildHtml = (msg: string, escapedName: string, escapedPlan: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${msg.split('\n').map(line => {
            const escapedLine = escapeHtml(line) || '&nbsp;';
            return `<p style="margin: 0 0 10px 0;">${escapedLine.replace(/\{name\}/g, escapedName).replace(/\{plan\}/g, escapedPlan)}</p>`;
          }).join('')}
        </div>
      `;

    const validCustomers = customers.filter(c => !!c.email);

    for (let i = 0; i < validCustomers.length; i += CHUNK_SIZE) {
      const chunk = validCustomers.slice(i, i + CHUNK_SIZE);

      const chunkResults = await Promise.all(chunk.map(async (customer) => {
        const escapedName = escapeHtml(customer.name);
        const escapedPlan = escapeHtml(customer.subscription_plan || 'N/A');
        const html = buildHtml(message, escapedName, escapedPlan);

        try {
          const result = await sendEmail(customer.email!, sanitizedSubject, html, fromName, fromEmail!, brevoApiKey, replyToEmail, attachments);
          if (!result.ok || result.json.error) {
            const errMsg = result.json.error?.message || result.json.error || 'Send failed';
            return { customer, ok: false, errMsg: typeof errMsg === 'string' ? errMsg : String(errMsg) };
          }
          return { customer, ok: true as const };
        } catch (e) {
          return { customer, ok: false, errMsg: 'Send error' };
        }
      }));

      for (const r of chunkResults) {
        if (r.ok) {
          emailResults.push({ email: r.customer.email!, success: true });
          successCount++;
          historyEntries.push({
            user_id: userId,
            customer_id: r.customer.id,
            customer_name: r.customer.name,
            customer_email: r.customer.email!,
            reminder_type: 'mass_email',
            plan_description: sanitizedSubject,
            status: 'sent',
            error_message: null,
          });
        } else {
          emailResults.push({ email: r.customer.email!, success: false, error: r.errMsg });
          failCount++;
          historyEntries.push({
            user_id: userId,
            customer_id: r.customer.id,
            customer_name: r.customer.name,
            customer_email: r.customer.email!,
            reminder_type: 'mass_email',
            plan_description: sanitizedSubject,
            status: 'failed',
            error_message: r.errMsg,
          });
        }
      }

      // Brief pause between chunks to stay under Brevo's per-second throttle
      // (free tier: 300/day; paid tiers have per-second limits).
      if (i + CHUNK_SIZE < validCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, INTER_CHUNK_DELAY_MS));
      }
    }

    // Batch insert all history entries
    if (historyEntries.length > 0) {
      try {
        await supabase.from('reminder_history').insert(historyEntries);
      } catch (logError) {
        console.error("Failed to log mass email history:", logError);
      }
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
