import { RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function PWAUpdatePrompt() {
  const { offlineReady, needRefresh, updateServiceWorker, close } = usePWA();

  useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline!', {
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
      close();
    }
  }, [offlineReady, close]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="p-4 shadow-elevated bg-card border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Update Available</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              A new version is ready to install
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={close}
          >
            Later
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => updateServiceWorker(true)}
          >
            Update now
          </Button>
        </div>
      </Card>
    </div>
  );
}
