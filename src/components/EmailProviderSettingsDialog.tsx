import { useEffect, useState, type ReactElement } from 'react';
import { Mail, CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppSettings } from '@/hooks/useAppSettings';

export function EmailProviderSettingsDialog({ trigger }: { trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const { data: settings } = useAppSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings && open) {
      setSenderEmail(settings.brevo_sender_email || '');
      setSenderName(settings.brevo_sender_name || '');
      setApiKey('');
      setHasExistingKey(!!settings.brevo_api_key);
      setTestResult(null);
    }
  }, [settings, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
        toast.error('Please enter a valid sender email');
        setSaving(false);
        return;
      }
      if (!senderName.trim()) {
        toast.error('Please enter a sender name');
        setSaving(false);
        return;
      }

      const updates: Record<string, unknown> = {
        email_provider: 'brevo',
        brevo_sender_email: senderEmail.trim(),
        brevo_sender_name: senderName.trim(),
        user_id: user.id,
      };
      if (apiKey.trim()) {
        updates.brevo_api_key = apiKey.trim();
      } else if (!hasExistingKey) {
        toast.error('Please enter your Brevo API key');
        setSaving(false);
        return;
      }

      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Use the sender name as the initial app_name; BrandingSettingsDialog can override later.
        const { error } = await supabase
          .from('app_settings')
          .insert({ ...updates, app_name: senderName.trim() });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Email provider settings saved');
      setOpen(false);
    } catch (e: any) {
      toast.error('Failed to save: ' + (e?.message ?? 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'test-brevo-connection',
        { body: {} },
      );
      if (error) throw error;
      if (data?.ok) {
        const acct = data.account?.email
          ? ` (account: ${data.account.email})`
          : '';
        setTestResult({ ok: true, message: `Connection successful${acct}` });
      } else {
        setTestResult({
          ok: false,
          message: data?.error || 'Connection failed',
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: e?.message || 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title="Email Provider Settings">
            <Mail className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Provider (Brevo)</DialogTitle>
          <DialogDescription>
            All emails are sent through Brevo. Configure the sender details
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <details className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground group">
            <summary className="flex items-center gap-2 cursor-pointer font-medium text-foreground list-none">
              <HelpCircle className="h-4 w-4" />
              <span className="flex-1">Full setup guide (5 minutes)</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium text-foreground">Step 1 — Create your Brevo account</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>Go to <a href="https://app.brevo.com" target="_blank" rel="noreferrer" className="underline">app.brevo.com</a> and sign up (free plan: 300 emails/day).</li>
                  <li>Verify your email when Brevo sends a confirmation.</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground">Step 2 — Verify your sender email</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>In Brevo, open <span className="font-mono">Senders, Domains &amp; Dedicated IPs → Senders</span>.</li>
                  <li>Click <span className="font-mono">Add a sender</span>, enter your name and the email you'll send from.</li>
                  <li>Open the confirmation email Brevo sends and click the verification link.</li>
                  <li>(Recommended) Also verify your domain under the <span className="font-mono">Domains</span> tab for better deliverability.</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground">Step 3 — Generate an API key</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>Go to <span className="font-mono">SMTP &amp; API → API Keys</span>.</li>
                  <li>Click <span className="font-mono">Generate a new API key</span>, name it (e.g. "My App"), and copy the key (starts with <span className="font-mono">xkeysib-</span>).</li>
                  <li>Save it somewhere safe — Brevo won't show it again.</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground">Step 4 — Paste into the fields below</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>Fill in <span className="font-medium">Sender name</span>, <span className="font-medium">Sender email</span> (from Step 2), and <span className="font-medium">Brevo API key</span> (from Step 3).</li>
                  <li>Click <span className="font-medium">Save</span>, then <span className="font-medium">Test connection</span> to confirm.</li>
                </ol>
              </div>
            </div>
          </details>

          <div className="space-y-2">
            <Label htmlFor="brevo-api-key">
              Brevo API key {hasExistingKey && <span className="text-xs text-muted-foreground">(saved — leave blank to keep)</span>}
            </Label>
            <Input
              id="brevo-api-key"
              type="password"
              placeholder={hasExistingKey ? '••••••••••••••••' : 'xkeysib-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brevo-sender-name">Sender name</Label>
            <Input
              id="brevo-sender-name"
              placeholder="Your App"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brevo-sender-email">Sender email</Label>
            <Input
              id="brevo-sender-email"
              type="email"
              placeholder="you@your-verified-domain.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              Must be from a domain verified in your Brevo account.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Test connection
            </Button>
            {testResult && (
              <div
                className={`flex items-start gap-2 text-sm rounded-md p-2 ${
                  testResult.ok
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
