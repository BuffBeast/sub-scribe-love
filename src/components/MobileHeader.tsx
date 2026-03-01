import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ExportCSVButton } from '@/components/ExportCSVButton';
import { ColumnSettingsDialog } from '@/components/ColumnSettingsDialog';
import { BrandingSettingsDialog } from '@/components/BrandingSettingsDialog';
import { ImportCustomersDialog } from '@/components/ImportCustomersDialog';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import { MassEmailDialog } from '@/components/MassEmailDialog';
import { Customer } from '@/hooks/useCustomers';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
interface MobileHeaderProps {
  displayName: string;
  displayLogo: string;
  displayTagline: string;
  customers: Customer[];
  customFields: any[];
  signOut: () => void;
}

export function MobileHeader({
  displayName,
  displayLogo,
  displayTagline,
  customers,
  customFields,
  signOut,
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isInStandaloneMode);

    // Capture the install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <img
              src={displayLogo}
              alt={`${displayName} logo`}
              className="h-10 w-10 object-contain drop-shadow-xl shrink-0 bg-white rounded-lg p-1"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-extrabold tracking-tight text-gradient truncate">
                {displayName}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {displayTagline}
              </p>
            </div>
          </div>
          
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <AddCustomerDialog onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }} />
                <ImportCustomersDialog onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }} />
                <div className="py-2">
                  <MassEmailDialog customers={customers} />
                </div>
                <div className="py-2">
                  <ExportCSVButton customers={customers} customFields={customFields} />
                </div>
                <div className="flex gap-2 py-2">
                  <ColumnSettingsDialog />
                  <BrandingSettingsDialog />
                </div>
                
                {/* Install App Button - only show if not installed and prompt available */}
                {!isInstalled && deferredPrompt && (
                  <div className="py-2">
                    <Button
                      variant="default"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        handleInstall();
                        setOpen(false);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Install App
                    </Button>
                  </div>
                )}

                <div className="border-t pt-4 mt-2 space-y-2">
                  <Link to="/analytics" onClick={() => setOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
