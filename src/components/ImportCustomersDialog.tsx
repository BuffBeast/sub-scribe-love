import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { scraperApi } from '@/lib/api/scraper';
import { Download, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ImportCustomersDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('https://ourpanel.live/reseller.php');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url) {
      toast({
        title: 'URL Required',
        description: 'Please enter a dashboard URL to scrape',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await scraperApi.scrapeCustomers(url);

      if (response.success && response.data) {
        setResult(response.data.markdown);
        toast({
          title: 'Success',
          description: 'Dashboard data scraped successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to scrape dashboard',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Scrape error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to scraping service',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Import Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers from External Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">Dashboard URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/dashboard"
                className="flex-1"
              />
              <Button onClick={handleScrape} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scraping...
                  </>
                ) : (
                  'Scrape'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the URL of the dashboard you want to import customer data from
            </p>
          </div>

          {result && (
            <div className="space-y-2">
              <Label>Scraped Content</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap">{result}</pre>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Review the extracted data above. Customer parsing will be added next.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
