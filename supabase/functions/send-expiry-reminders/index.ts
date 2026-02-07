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
    .replace(/[\r\n]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 200);
}

async function sendEmail(to: string, subject: string, html: string, fromName: string, replyTo?: string | null) {
  const emailPayload: Record<string, unknown> = {
    from: `${fromName} <noreply@letsstreamtracker.ca>`,
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

interface CustomerExpiry {
  id: string;
  name: string;
  email: string;
  user_id: string;
  liveExpiring: boolean;
  livePlan: string | null;
  liveDate: string | null;
  vodExpiring: boolean;
  vodPlan: string | null;
  vodDate: string | null;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's reminder settings
    const { data: userSettings } = await supabase
      .from('app_settings')
      .select('reminder_days, reminder_subject, reminder_message, reply_to_email, app_name')
      .eq('user_id', userId)
      .maybeSingle();

    const reminderDays = userSettings?.reminder_days ?? 30;

    // Calculate the target date
    const today = new Date();
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() + reminderDays);
    const targetDate = targetDateObj.toISOString().split('T')[0];

    console.log(`Checking for customers expiring in ${reminderDays} days (on: ${targetDate})`);

    // Get all customers with reminders enabled who have EITHER LIVE or VOD expiring on target date
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, subscription_plan, subscription_end_date, vod_plan, vod_end_date, reminders_enabled, user_id')
      .eq('user_id', userId)
      .eq('reminders_enabled', true)
      .not('email', 'is', null)
      .or(`subscription_end_date.eq.${targetDate},vod_end_date.eq.${targetDate}`);

    if (error) throw error;

    // Build list of customers with their expiring subscriptions
    const customersToNotify: CustomerExpiry[] = [];

    for (const customer of customers || []) {
      if (!customer.email) continue;

      const liveExpiring = customer.subscription_end_date === targetDate && customer.subscription_plan;
      const vodExpiring = customer.vod_end_date === targetDate && customer.vod_plan;

      if (liveExpiring || vodExpiring) {
        customersToNotify.push({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          user_id: customer.user_id,
          liveExpiring: !!liveExpiring,
          livePlan: customer.subscription_plan,
          liveDate: customer.subscription_end_date,
          vodExpiring: !!vodExpiring,
          vodPlan: customer.vod_plan,
          vodDate: customer.vod_end_date,
        });
      }
    }

    const liveCount = customersToNotify.filter(c => c.liveExpiring).length;
    const vodCount = customersToNotify.filter(c => c.vodExpiring).length;
    const bothCount = customersToNotify.filter(c => c.liveExpiring && c.vodExpiring).length;

    console.log(`Found ${customersToNotify.length} customers: ${liveCount} LIVE, ${vodCount} VOD, ${bothCount} both`);

    // Validate settings once
    let subjectTemplate = "Your subscription expires soon";
    let messageTemplate = `Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!`;
    let replyToEmail: string | null = null;
    let fromName = "Let's Stream"; // Default fallback

    if (userSettings) {
      const validatedSettings = reminderSettingsSchema.safeParse(userSettings);
      if (validatedSettings.success) {
        const safeSettings = validatedSettings.data;
        if (safeSettings.reminder_subject) {
          subjectTemplate = sanitizeEmailSubject(safeSettings.reminder_subject);
        }
        if (safeSettings.reminder_message) {
          messageTemplate = safeSettings.reminder_message.slice(0, 10000);
        }
        if (safeSettings.reply_to_email) {
          replyToEmail = safeSettings.reply_to_email;
        }
      }
      // Get app_name outside of zod validation (it's not in the schema)
      if (userSettings.app_name) {
        fromName = userSettings.app_name;
      }
    }

    const emailResults = [];

    for (const customer of customersToNotify) {
      const escapedName = escapeHtml(customer.name);
      
      // Build plan description based on what's expiring
      let planDescription: string;
      let expiryDate: string;

      if (customer.liveExpiring && customer.vodExpiring) {
        // Both expiring on same date
        planDescription = "LIVE and VOD";
        expiryDate = new Date(customer.liveDate!).toLocaleDateString();
      } else if (customer.liveExpiring) {
        planDescription = "LIVE";
        expiryDate = new Date(customer.liveDate!).toLocaleDateString();
      } else {
        planDescription = "VOD";
        expiryDate = new Date(customer.vodDate!).toLocaleDateString();
      }

      const escapedDate = escapeHtml(expiryDate);
      
      const messageBody = messageTemplate
        .replace(/\{name\}/g, escapedName)
        .replace(/\{plan\}/g, planDescription)
        .replace(/\{date\}/g, escapedDate);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${messageBody.split('\n').map(line => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('')}
        </div>
      `;

      try {
        const result = await sendEmail(customer.email, subjectTemplate, html, fromName, replyToEmail);
        emailResults.push({ 
          email: customer.email, 
          types: customer.liveExpiring && customer.vodExpiring ? 'LIVE+VOD' : (customer.liveExpiring ? 'LIVE' : 'VOD'),
          success: true, 
          result 
        });
      } catch (e) {
        emailResults.push({ 
          email: customer.email, 
          types: customer.liveExpiring && customer.vodExpiring ? 'LIVE+VOD' : (customer.liveExpiring ? 'LIVE' : 'VOD'),
          success: false, 
          error: String(e) 
        });
      }
    }

    return new Response(JSON.stringify({ 
      processed: customersToNotify.length,
      live: liveCount,
      vod: vodCount,
      both: bothCount,
      results: emailResults 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
