import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Upload, FileSpreadsheet, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';
import { useCreateCustomer } from '@/hooks/useCustomers';

interface ParsedCustomer {
  name: string;
  email: string;
  phone: string;
  company: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  totalSpent: number;
  [key: string]: string | number;
}

interface ImportCustomersDialogProps {}

export function ImportCustomersDialog({}: ImportCustomersDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createCustomer = useCreateCustomer();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setParsedData([]);
    setColumns([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsLoading(false);
        
        if (results.errors.length > 0) {
          toast({
            title: 'Parse Error',
            description: results.errors[0].message,
            variant: 'destructive',
          });
          return;
        }

        const data = results.data as ParsedCustomer[];
        if (data.length === 0) {
          toast({
            title: 'No Data',
            description: 'The file appears to be empty',
            variant: 'destructive',
          });
          return;
        }

        setColumns(Object.keys(data[0]));
        setParsedData(data);
        
        toast({
          title: 'File Parsed',
          description: `Found ${data.length} records`,
        });
      },
      error: (error) => {
        setIsLoading(false);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const mapToCustomer = (row: ParsedCustomer) => {
    // Try to find matching columns (case-insensitive)
    const findValue = (keys: string[]): string => {
      for (const key of keys) {
        const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
        if (found && row[found]) return String(row[found]);
      }
      return '';
    };

    const findNumber = (keys: string[]): number => {
      const val = findValue(keys);
      return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
    };

    const status = findValue(['status', 'subscription', 'state']).toLowerCase();
    let subscription_status = 'active';
    if (status.includes('trial')) subscription_status = 'trial';
    else if (status.includes('expired') || status.includes('inactive')) subscription_status = 'expired';
    else if (status.includes('cancel')) subscription_status = 'cancelled';

    return {
      name: findValue(['name', 'customer', 'user', 'username']) || 'Unknown',
      email: findValue(['email', 'mail', 'e-mail']) || null,
      phone: findValue(['phone', 'tel', 'mobile', 'contact']) || null,
      company: findValue(['company', 'business', 'organization', 'org']) || null,
      subscription_status,
      subscription_plan: findValue(['plan', 'package', 'tier', 'subscription']) || null,
      total_spent: findNumber(['spent', 'revenue', 'total', 'amount', 'balance', 'credits']),
    };
  };

  const handleImport = async () => {
    const customers = parsedData.map((row) => mapToCustomer(row));
    
    let imported = 0;
    for (const customer of customers) {
      try {
        await createCustomer.mutateAsync(customer);
        imported++;
      } catch (e) {
        console.error('Failed to import customer:', e);
      }
    }
    
    toast({
      title: 'Import Complete',
      description: `Imported ${imported} of ${customers.length} customers`,
    });
    
    setOpen(false);
    setParsedData([]);
    setColumns([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Import Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV/Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Upload Section */}
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Click to upload CSV or Excel file</p>
                <p className="text-sm text-muted-foreground">
                  Export your customer list from ourpanel.live and upload it here
                </p>
              </div>
            )}
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Preview: {parsedData.length} records found
                </p>
                <Button onClick={handleImport} className="gap-2">
                  <Check className="h-4 w-4" />
                  Import {parsedData.length} Customers
                </Button>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 6).map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                      {columns.length > 6 && (
                        <TableHead className="text-muted-foreground">
                          +{columns.length - 6} more
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {columns.slice(0, 6).map((col) => (
                          <TableCell key={col} className="max-w-[150px] truncate">
                            {String(row[col] || '')}
                          </TableCell>
                        ))}
                        {columns.length > 6 && (
                          <TableCell className="text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                    {parsedData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={Math.min(columns.length, 7)} className="text-center text-muted-foreground">
                          ... and {parsedData.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
