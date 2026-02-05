import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileSpreadsheet, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { z } from 'zod';

// Validation schema for imported customer data
const customerImportSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().trim().email('Invalid email').max(255).nullable().or(z.literal('')).transform(val => val || null),
  phone: z.string().trim().max(50, 'Phone too long').nullable().or(z.literal('')).transform(val => val || null),
  company: z.string().trim().max(255, 'Company name too long').nullable().or(z.literal('')).transform(val => val || null),
  subscription_status: z.enum(['active', 'trial', 'expired', 'cancelled']).default('active'),
  subscription_plan: z.string().trim().max(100).nullable().or(z.literal('')).transform(val => val || null),
  total_spent: z.number().min(0, 'Total spent cannot be negative').max(999999999, 'Total spent too large').default(0),
});

type ValidatedCustomer = z.infer<typeof customerImportSchema>;

// Constants for limits
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROW_COUNT = 10000;

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createCustomer = useCreateCustomer();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: 'File Too Large',
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please use a smaller file.`,
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);
    setParsedData([]);
    setColumns([]);
    setValidationErrors([]);

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

        // Row count validation
        if (data.length > MAX_ROW_COUNT) {
          toast({
            title: 'Too Many Rows',
            description: `Maximum ${MAX_ROW_COUNT.toLocaleString()} rows allowed. Your file has ${data.length.toLocaleString()} rows.`,
            variant: 'destructive',
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
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

  const mapToCustomer = (row: ParsedCustomer): { name: string; email: string | null; phone: string | null; company: string | null; subscription_status: string; subscription_plan: string | null; total_spent: number } => {
    // Try to find matching columns (case-insensitive)
    const findValue = (keys: string[]): string => {
      for (const key of keys) {
        const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
        if (found && row[found]) return String(row[found]).trim();
      }
      return '';
    };

    const findNumber = (keys: string[]): number => {
      const val = findValue(keys);
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    const status = findValue(['status', 'subscription', 'state']).toLowerCase();
    let subscription_status: 'active' | 'trial' | 'expired' | 'cancelled' = 'active';
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

  const validateCustomer = (customer: ReturnType<typeof mapToCustomer>, rowIndex: number): ValidatedCustomer | null => {
    const result = customerImportSchema.safeParse(customer);
    if (!result.success) {
      const errorMessages = result.error.errors.map(e => `Row ${rowIndex + 1}: ${e.path.join('.')} - ${e.message}`);
      return null;
    }
    return result.data;
  };

  const handleImport = async () => {
    const errors: string[] = [];
    const validCustomers: ValidatedCustomer[] = [];

    // Validate all customers first
    parsedData.forEach((row, index) => {
      const mapped = mapToCustomer(row);
      const result = customerImportSchema.safeParse(mapped);
      
      if (!result.success) {
        result.error.errors.forEach(e => {
          errors.push(`Row ${index + 1}: ${e.path.join('.') || 'data'} - ${e.message}`);
        });
      } else {
        validCustomers.push(result.data);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors.slice(0, 10)); // Show first 10 errors
      if (errors.length > 10) {
        toast({
          title: 'Validation Errors',
          description: `${errors.length} validation errors found. Showing first 10.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Validation Errors',
          description: `${errors.length} validation errors found. Please fix and try again.`,
          variant: 'destructive',
        });
      }
      return;
    }
    
    let imported = 0;
    for (const customer of validCustomers) {
      try {
        await createCustomer.mutateAsync(customer);
        imported++;
      } catch (e) {
        console.error('Failed to import customer:', e);
      }
    }
    
    toast({
      title: 'Import Complete',
      description: `Imported ${imported} of ${validCustomers.length} customers`,
    });
    
    setOpen(false);
    setParsedData([]);
    setColumns([]);
    setValidationErrors([]);
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
                <p className="text-xs text-muted-foreground">
                  Max {MAX_FILE_SIZE_MB}MB, up to {MAX_ROW_COUNT.toLocaleString()} rows
                </p>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="border border-destructive rounded-md p-4 bg-destructive/10">
              <p className="font-medium text-destructive mb-2">Validation Errors:</p>
              <ul className="text-sm text-destructive space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

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
