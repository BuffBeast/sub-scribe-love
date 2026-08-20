import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAppSettings } from '@/hooks/useAppSettings';
import { EmailProviderSettingsDialog } from '@/components/EmailProviderSettingsDialog';

export function EmailSetupBanner() {
  const { data: settings, isLoading } = useAppSettings();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (settings) {
      supabase.rpc('has_brevo_api_key').then(({ data }) => {
        setHasKey(!!data);
      });
    }
  }, [settings]);

  if (isLoading || hasKey === null || dismissed) return null;

  const senderEmail = settings?.brevo_sender_email;
  const senderName = settings?.brevo_sender_name;
  const isConfigured = hasKey && senderEmail && senderName;

  if (isConfigured) return null;

  let missingItems: string[] = [];
  if (!hasKey) missingItems.push('Brevo API key');
  if (!senderName) missingItems.push('sender name');
  if (!senderEmail) missingItems.push('sender email');

  const missingText = missingItems.join(', ');

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 shrink-0">
          <Mail className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Email sending is not fully configured
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Missing: {missingText}. Reminders and mass emails will not send until you add these details.
          </p>
          <div className="mt-2">
            <EmailProviderSettingsDialog
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Open Email settings
                </Button>
              }
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 -mr-1 -mt-1"
          onClick={() => setDismissed(true)}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
