import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Validation schemas for settings
const reminderSettingsSchema = z.object({
  reminder_subject: z.string().max(200).nullable().optional(),
  reminder_message: z.string().max(10000).nullable().optional(),
  reply_to_email: z.string().email().nullable().optional(),
  reminder_days: z.number().int().min(1).max(90).optional().default(30),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

async function sendEmail(to: string, subject: string, html: string, replyTo?: string | null) {
  const emailPayload: Record<string, unknown> = {
    from: "Subscription Reminder <noreply@yourdomain.com>", // Update with your verified domain
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
    console.log(`Authenticated user ${userId} triggered send-expiry-reminders`);

    // Use service role key for database operations (to send reminders for all qualifying customers)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's reminder settings first to determine the days
    const { data: userSettings } = await supabase
      .from('app_settings')
      .select('reminder_days')
      .eq('user_id', userId)
      .maybeSingle();

    const reminderDays = userSettings?.reminder_days ?? 30;

    // Calculate the target date based on user's reminder_days setting
    const today = new Date();
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() + reminderDays);
    const targetDate = targetDateObj.toISOString().split('T')[0];

    console.log(`Checking for customers expiring in ${reminderDays} days (on: ${targetDate})`);

    // Get customers expiring in 30 days with reminders enabled - ONLY for the authenticated user
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, subscription_plan, subscription_end_date, reminders_enabled, user_id')
      .eq('user_id', userId)  // Security: Only query this user's customers
      .eq('subscription_end_date', targetDate)
      .eq('reminders_enabled', true)
      .not('email', 'is', null);

    if (error) throw error;

    console.log(`Found ${customers?.length || 0} customers expiring in 30 days`);

    const emailResults = [];

    for (const customer of customers || []) {
      if (!customer.email) continue;

      // Fetch user's custom reminder settings
      let subject = "Your subscription expires in 30 days";
      let messageTemplate = `Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!`;

      let replyToEmail: string | null = null;

      if (customer.user_id) {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('reminder_subject, reminder_message, reply_to_email')
          .eq('user_id', customer.user_id)
          .maybeSingle();

        // Validate settings before using
        if (settings) {
          const validatedSettings = reminderSettingsSchema.safeParse(settings);
          if (validatedSettings.success) {
            const safeSettings = validatedSettings.data;
            if (safeSettings.reminder_subject) {
              subject = sanitizeEmailSubject(safeSettings.reminder_subject);
            }
            if (safeSettings.reminder_message) {
              // Enforce max length on message template
              messageTemplate = safeSettings.reminder_message.slice(0, 10000);
            }
            if (safeSettings.reply_to_email) {
              replyToEmail = safeSettings.reply_to_email;
            }
          } else {
            console.warn(`Invalid settings for user ${customer.user_id}:`, validatedSettings.error);
          }
        }
      }

      // Replace placeholders with escaped values to prevent XSS
      const formattedDate = new Date(customer.subscription_end_date).toLocaleDateString();
      const escapedName = escapeHtml(customer.name);
      const escapedPlan = escapeHtml(customer.subscription_plan || 'subscription');
      const escapedDate = escapeHtml(formattedDate);
      
      const messageBody = messageTemplate
        .replace(/\{name\}/g, escapedName)
        .replace(/\{plan\}/g, escapedPlan)
        .replace(/\{date\}/g, escapedDate);

      // Escape each line of the message body for safe HTML rendering
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${messageBody.split('\n').map(line => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('')}
        </div>
      `;

      try {
        const result = await sendEmail(customer.email, subject, html, replyToEmail);
        emailResults.push({ email: customer.email, success: true, result });
      } catch (e) {
        emailResults.push({ email: customer.email, success: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: customers?.length || 0, results: emailResults }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});