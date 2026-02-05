import { useState, useRef, useEffect } from 'react';
import { Settings, Upload, X } from 'lucide-react';
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
import { useAppSettings, useUpdateAppSettings, useUploadLogo } from '@/hooks/useAppSettings';
import letsStreamLogo from '@/assets/lets-stream-logo.png';

export function BrandingSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const uploadLogo = useUploadLogo();

  useEffect(() => {
    if (settings && open) {
      setAppName(settings.app_name);
      setLogoPreview(settings.logo_url);
      setPendingLogoFile(null);
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
    let logoUrl = settings?.logo_url ?? null;

    if (pendingLogoFile) {
      logoUrl = await uploadLogo.mutateAsync(pendingLogoFile);
    } else if (logoPreview === null) {
      logoUrl = null;
    }

    await updateSettings.mutateAsync({ appName, logoUrl });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Branding Settings</DialogTitle>
          <DialogDescription>
            Customize your app name and logo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
        </div>

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
