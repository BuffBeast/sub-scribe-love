import { useState, useRef, useEffect } from 'react';
import { Settings, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppSettings, useUpdateAppSettings, useUploadLogo } from '@/hooks/useAppSettings';
import { ColorThemePicker, ThemeColor } from '@/components/ColorThemePicker';
import letsStreamLogo from '@/assets/lets-stream-logo.png';

export function BrandingSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [reminderSubject, setReminderSubject] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [themeColor, setThemeColor] = useState<ThemeColor>('purple');
  const [reminderDays, setReminderDays] = useState(30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const uploadLogo = useUploadLogo();

  useEffect(() => {
    if (settings && open) {
      setAppName(settings.app_name);
      setTagline(settings.tagline || 'Your spooky-good customer dashboard 👻');
      setLogoPreview(settings.logo_url);
      setPendingLogoFile(null);
      setReminderSubject(settings.reminder_subject || 'Your subscription expires soon');
      setReminderMessage(settings.reminder_message || 'Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!');
      setReplyToEmail(settings.reply_to_email || '');
      setThemeColor((settings.theme_color as ThemeColor) || 'purple');
      setReminderDays(settings.reminder_days ?? 30);
    }
  }, [settings, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setPendingLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!appName.trim()) {
      toast.error('App name is required');
      return;
    }
    if (!reminderSubject.trim()) {
      toast.error('Email subject is required');
      return;
    }
    if (!reminderMessage.trim()) {
      toast.error('Email message is required');
      return;
    }

    let logoUrl = settings?.logo_url ?? null;

    if (pendingLogoFile) {
      logoUrl = await uploadLogo.mutateAsync(pendingLogoFile);
    } else if (logoPreview === null) {
      logoUrl = null;
    }

    await updateSettings.mutateAsync({ 
      appName, 
      logoUrl,
      tagline,
      reminderSubject,
      reminderMessage,
      replyToEmail: replyToEmail.trim() || null,
      themeColor,
      reminderDays,
    });
    setOpen(false);
  };

  const currentLogo = logoPreview || letsStreamLogo;
  const isLoading = updateSettings.isPending || uploadLogo.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your branding and email reminders
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="reminders">Email Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Enter app name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Enter your tagline"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentLogo}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: Square image, at least 128x128px
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accent Color</Label>
              <ColorThemePicker value={themeColor} onChange={setThemeColor} />
              <p className="text-xs text-muted-foreground">
                Choose a color theme for your dashboard
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Days Before Expiry to Send Reminder</Label>
                <span className="text-sm font-medium text-primary">{reminderDays} days</span>
              </div>
              <Slider
                value={[reminderDays]}
                onValueChange={(value) => setReminderDays(value[0])}
                min={1}
                max={90}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Reminders will be sent {reminderDays} day{reminderDays !== 1 ? 's' : ''} before subscription expiry
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyToEmail">Reply-To Email (optional)</Label>
              <Input
                id="replyToEmail"
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                placeholder="replies@yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">
                When customers reply to reminder emails, replies will go to this address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderSubject">Email Subject</Label>
              <Input
                id="reminderSubject"
                value={reminderSubject}
                onChange={(e) => setReminderSubject(e.target.value)}
                placeholder="Your subscription expires in 30 days"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderMessage">Email Message</Label>
              <Textarea
                id="reminderMessage"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Enter your reminder message..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {'{name}'}, {'{plan}'}, {'{date}'}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !appName.trim()}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
