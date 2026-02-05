import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 30 days from now
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const targetDate = thirtyDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking for customers expiring on: ${targetDate}`);

    // Get customers expiring in 30 days with reminders enabled
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, subscription_plan, subscription_end_date, reminders_enabled, user_id')
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

        if (settings?.reminder_subject) {
          subject = settings.reminder_subject;
        }
        if (settings?.reminder_message) {
          messageTemplate = settings.reminder_message;
        }
        if (settings?.reply_to_email) {
          replyToEmail = settings.reply_to_email;
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