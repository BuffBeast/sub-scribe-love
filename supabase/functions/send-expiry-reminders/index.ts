import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const reminderSettingsSchema = z.object({
  reminder_subject: z.string().max(200).nullable().optional(),
  reminder_message: z.string().max(10000).nullable().optional(),
  reply_to_email: z.string().email().nullable().optional(),
  reminder_days: z.number().int().min(1).max(90).optional().default(30),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function sanitizeEmailSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 200);
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

  const result = await response.json();

  if (!response.ok) {
    console.error(`Resend API error (${response.status}):`, result);
    throw new Error(`Resend API error: ${result?.message || result?.error?.message || response.statusText}`);
  }

  return result;
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

interface UserSettings {
  user_id: string;
  reminder_days: number;
  reminder_subject: string | null;
  reminder_message: string | null;
  reply_to_email: string | null;
  app_name: string;
}

async function processUserReminders(
  supabase: ReturnType<typeof createClient>,
  userSettings: UserSettings
): Promise<{ userId: string; processed: number; success: number; failed: number; results: unknown[] }> {
  const { user_id: userId, reminder_days: reminderDays } = userSettings;

  const today = new Date();
  const targetDateObj = new Date(today);
  targetDateObj.setDate(today.getDate() + reminderDays);
  const targetDate = targetDateObj.toISOString().split('T')[0];

  console.log(`[User ${userId}] Checking for customers expiring in ${reminderDays} days (on: ${targetDate})`);

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, subscription_plan, subscription_end_date, vod_plan, vod_end_date, reminders_enabled, user_id')
    .eq('user_id', userId)
    .eq('reminders_enabled', true)
    .not('email', 'is', null)
    .or(`subscription_end_date.eq.${targetDate},vod_end_date.eq.${targetDate}`);

  if (error) {
    console.error(`[User ${userId}] Database query failed:`, error);
    return { userId, processed: 0, success: 0, failed: 0, results: [{ error: "Database query failed" }] };
  }

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

  console.log(`[User ${userId}] Found ${customersToNotify.length} customers to notify`);

  // Build templates
  let subjectTemplate = "Your subscription expires soon";
  let messageTemplate = `Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!`;
  let replyToEmail: string | null = userSettings.reply_to_email;
  const fromName = userSettings.app_name || "Let's Stream";

  const validatedSettings = reminderSettingsSchema.safeParse(userSettings);
  if (validatedSettings.success) {
    if (validatedSettings.data.reminder_subject) {
      subjectTemplate = sanitizeEmailSubject(validatedSettings.data.reminder_subject);
    }
    if (validatedSettings.data.reminder_message) {
      messageTemplate = validatedSettings.data.reminder_message.slice(0, 10000);
    }
  }

  const emailResults: unknown[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const customer of customersToNotify) {
    const escapedName = escapeHtml(customer.name);

    let planDescription: string;
    let expiryDate: string;

    if (customer.liveExpiring && customer.vodExpiring) {
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
    const finalSubject = subjectTemplate.replace(/\{app_name\}/g, fromName);
    const escapedPlan = escapeHtml(planDescription);
    const escapedFromName = escapeHtml(fromName);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${messageTemplate.split('\n').map(line => {
          const escapedLine = escapeHtml(line) || '&nbsp;';
          return `<p>${escapedLine.replace(/\{name\}/g, escapedName).replace(/\{plan\}/g, escapedPlan).replace(/\{date\}/g, escapedDate).replace(/\{app_name\}/g, escapedFromName)}</p>`;
        }).join('')}
      </div>
    `;

    try {
      const result = await sendEmail(customer.email, finalSubject, html, fromName, replyToEmail);
      emailResults.push({
        email: customer.email,
        types: customer.liveExpiring && customer.vodExpiring ? 'LIVE+VOD' : (customer.liveExpiring ? 'LIVE' : 'VOD'),
        success: true,
        id: result?.id,
      });
      successCount++;
    } catch (e) {
      emailResults.push({
        email: customer.email,
        types: customer.liveExpiring && customer.vodExpiring ? 'LIVE+VOD' : (customer.liveExpiring ? 'LIVE' : 'VOD'),
        success: false,
        error: String(e),
      });
      failCount++;
    }

    // Small delay to avoid Resend rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[User ${userId}] Sent ${successCount} emails, ${failCount} failed`);

  return { userId, processed: customersToNotify.length, success: successCount, failed: failCount, results: emailResults };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine if this is a cron call (service role / anon key) or a user call
    let userIds: string[] = [];
    let isCronCall = false;

    // Try to authenticate as a real user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);

    if (!authError && claimsData?.claims?.sub) {
      // Check if the sub is a real user (not the anon key's ref)
      const { data: userCheck } = await supabase.auth.admin.getUserById(claimsData.claims.sub as string);
      if (userCheck?.user) {
        // Real user - process only their customers
        userIds = [claimsData.claims.sub as string];
        console.log(`Manual trigger by user ${userIds[0]}`);
      } else {
        isCronCall = true;
      }
    } else {
      isCronCall = true;
    }

    if (isCronCall) {
      // Cron job: process ALL users who have app_settings
      console.log("Cron job trigger - processing all users");
      const { data: allSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('user_id');

      if (settingsError || !allSettings) {
        console.error("Failed to fetch user settings:", settingsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      userIds = allSettings.map(s => s.user_id);
      console.log(`Found ${userIds.length} users to process`);
    }

    // Fetch settings for all users we need to process
    const { data: settingsList } = await supabase
      .from('app_settings')
      .select('user_id, reminder_days, reminder_subject, reminder_message, reply_to_email, app_name')
      .in('user_id', userIds);

    const allResults: unknown[] = [];
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const settings = settingsList?.find(s => s.user_id === userId);
      const userSettings: UserSettings = {
        user_id: userId,
        reminder_days: settings?.reminder_days ?? 30,
        reminder_subject: settings?.reminder_subject ?? null,
        reminder_message: settings?.reminder_message ?? null,
        reply_to_email: settings?.reply_to_email ?? null,
        app_name: settings?.app_name ?? "Let's Stream",
      };

      const result = await processUserReminders(supabase, userSettings);
      allResults.push(result);
      totalProcessed += result.processed;
      totalSuccess += result.success;
      totalFailed += result.failed;
    }

    console.log(`Total: ${totalProcessed} processed, ${totalSuccess} sent, ${totalFailed} failed across ${userIds.length} user(s)`);

    return new Response(JSON.stringify({
      users: userIds.length,
      totalProcessed,
      totalSuccess,
      totalFailed,
      details: allResults,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});