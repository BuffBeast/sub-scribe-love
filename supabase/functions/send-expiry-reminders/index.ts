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
): Promise<{ userId: string; processed: number; success: number; failed: number; skippedDuplicate: number; results: unknown[] }> {
  const { user_id: userId, reminder_days: reminderDays } = userSettings;

  // Calculate date range: today through today + reminderDays (inclusive)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + reminderDays);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  console.log(`[User ${userId}] Checking for customers expiring between ${todayStr} and ${futureDateStr} (within ${reminderDays} days)`);

  // Query customers with expiry dates within the reminder window
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, subscription_plan, subscription_end_date, vod_plan, vod_end_date, reminders_enabled, user_id')
    .eq('user_id', userId)
    .eq('reminders_enabled', true)
    .not('email', 'is', null)
    .or(
      `and(subscription_end_date.gte.${todayStr},subscription_end_date.lte.${futureDateStr}),and(vod_end_date.gte.${todayStr},vod_end_date.lte.${futureDateStr})`
    );

  if (error) {
    console.error(`[User ${userId}] Database query failed:`, error);
    return { userId, processed: 0, success: 0, failed: 0, skippedDuplicate: 0, results: [{ error: "Database query failed" }] };
  }

  // Deduplication: check which customers already received an expiry reminder recently
  // We check for any successful reminder sent within the current reminder window
  const customerIds = (customers || []).map(c => c.id);
  let alreadySentSet = new Set<string>();

  if (customerIds.length > 0) {
    const { data: recentReminders } = await supabase
      .from('reminder_history')
      .select('customer_id')
      .eq('user_id', userId)
      .eq('reminder_type', 'expiry')
      .eq('status', 'sent')
      .gte('sent_at', new Date(today.getTime() - reminderDays * 24 * 60 * 60 * 1000).toISOString())
      .in('customer_id', customerIds);

    if (recentReminders) {
      alreadySentSet = new Set(recentReminders.map(r => r.customer_id));
    }
  }

  const customersToNotify: CustomerExpiry[] = [];
  let skippedDuplicate = 0;

  for (const customer of customers || []) {
    if (!customer.email) continue;

    // Skip if already sent a reminder in this window
    if (alreadySentSet.has(customer.id)) {
      console.log(`[User ${userId}] Skipping ${customer.name} - already reminded recently`);
      skippedDuplicate++;
      continue;
    }

    const liveInWindow = customer.subscription_end_date &&
      customer.subscription_end_date >= todayStr &&
      customer.subscription_end_date <= futureDateStr &&
      customer.subscription_plan;

    const vodInWindow = customer.vod_end_date &&
      customer.vod_end_date >= todayStr &&
      customer.vod_end_date <= futureDateStr &&
      customer.vod_plan;

    if (liveInWindow || vodInWindow) {
      customersToNotify.push({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        user_id: customer.user_id,
        liveExpiring: !!liveInWindow,
        livePlan: customer.subscription_plan,
        liveDate: customer.subscription_end_date,
        vodExpiring: !!vodInWindow,
        vodPlan: customer.vod_plan,
        vodDate: customer.vod_end_date,
      });
    }
  }

  console.log(`[User ${userId}] Found ${customersToNotify.length} customers to notify (${skippedDuplicate} skipped as duplicates)`);

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

    const typeLabel = customer.liveExpiring && customer.vodExpiring ? 'LIVE+VOD' : (customer.liveExpiring ? 'LIVE' : 'VOD');
    const expiryDateForLog = customer.liveExpiring ? customer.liveDate : customer.vodDate;

    try {
      const result = await sendEmail(customer.email, finalSubject, html, fromName, replyToEmail);
      emailResults.push({
        email: customer.email,
        types: typeLabel,
        success: true,
        id: result?.id,
      });
      successCount++;

      await supabase.from('reminder_history').insert({
        user_id: customer.user_id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        reminder_type: 'expiry',
        plan_description: typeLabel,
        expiry_date: expiryDateForLog,
        status: 'sent',
      });
    } catch (e) {
      emailResults.push({
        email: customer.email,
        types: typeLabel,
        success: false,
        error: String(e),
      });
      failCount++;

      await supabase.from('reminder_history').insert({
        user_id: customer.user_id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        reminder_type: 'expiry',
        plan_description: typeLabel,
        expiry_date: expiryDateForLog,
        status: 'failed',
        error_message: String(e).slice(0, 500),
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[User ${userId}] Sent ${successCount} emails, ${failCount} failed, ${skippedDuplicate} skipped`);

  return { userId, processed: customersToNotify.length, success: successCount, failed: failCount, skippedDuplicate, results: emailResults };
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

    let userIds: string[] = [];
    let isCronCall = false;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);

    if (!authError && claimsData?.claims?.sub) {
      const { data: userCheck } = await supabase.auth.admin.getUserById(claimsData.claims.sub as string);
      if (userCheck?.user) {
        userIds = [claimsData.claims.sub as string];
        console.log(`Manual trigger by user ${userIds[0]}`);
      } else {
        isCronCall = true;
      }
    } else {
      isCronCall = true;
    }

    if (isCronCall) {
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

    const { data: settingsList } = await supabase
      .from('app_settings')
      .select('user_id, reminder_days, reminder_subject, reminder_message, reply_to_email, app_name')
      .in('user_id', userIds);

    const allResults: unknown[] = [];
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

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
      totalSkipped += result.skippedDuplicate;
    }

    console.log(`Total: ${totalProcessed} processed, ${totalSuccess} sent, ${totalFailed} failed, ${totalSkipped} skipped across ${userIds.length} user(s)`);

    return new Response(JSON.stringify({
      users: userIds.length,
      totalProcessed,
      totalSuccess,
      totalFailed,
      totalSkipped,
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
