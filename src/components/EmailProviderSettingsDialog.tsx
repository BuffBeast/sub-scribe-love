import { useEffect, useState, type ReactElement } from 'react';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (settings && open) {
      setSenderEmail((settings as any).brevo_sender_email || '');
      setSenderName((settings as any).brevo_sender_name || '');
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

      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update(updates as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ ...updates, app_name: 'My App' } as any);
        if (error) throw error;
      }

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
        <Button variant="ghost" size="icon" title="Email Provider Settings">
          <Mail className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Provider (Brevo)</DialogTitle>
          <DialogDescription>
            All emails are sent through Brevo. Configure the sender details
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Your Brevo API key is stored securely as a backend secret named{' '}
            <code className="font-mono">BREVO_API_KEY</code>.
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
