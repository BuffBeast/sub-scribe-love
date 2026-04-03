import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileSpreadsheet, Check, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';
import { useCreateCustomer, useUpdateCustomer, useCustomers } from '@/hooks/useCustomers';
import { z } from 'zod';

// Helper for date validation
const dateStringSchema = z.string().trim()
  .refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid date format' })
  .transform(val => val || null)
  .nullable();

const customerImportSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().trim().email('Invalid email').max(255).nullable().or(z.literal('')).transform(val => val || null),
  phone: z.string().trim().max(50, 'Phone too long').nullable().or(z.literal('')).transform(val => val || null),
  company: z.string().trim().max(255, 'Company name too long').nullable().or(z.literal('')).transform(val => val || null),
  subscription_status: z.enum(['active', 'trial', 'expired', 'cancelled']).default('active'),
  subscription_plan: z.string().trim().max(100).nullable().or(z.literal('')).transform(val => val || null),
  subscription_start_date: dateStringSchema,
  subscription_end_date: dateStringSchema,
  vod_plan: z.string().trim().max(100).nullable().or(z.literal('')).transform(val => val || null),
  vod_start_date: dateStringSchema,
  vod_end_date: dateStringSchema,
  total_spent: z.number().min(0, 'Total spent cannot be negative').max(999999999, 'Total spent too large').default(0),
  service: z.string().trim().max(100).nullable().or(z.literal('')).transform(val => val || null),
  device: z.string().trim().max(100).nullable().or(z.literal('')).transform(val => val ? val.split(',').map(d => d.trim()).filter(Boolean) : []),
  has_trial: z.boolean().default(false),
  has_live_trial: z.boolean().default(false),
  has_vod_trial: z.boolean().default(false),
});

type ValidatedCustomer = z.infer<typeof customerImportSchema>;

// Constants for limits
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROW_COUNT = 10000;

// Header alias map: normalized key → internal field name
const HEADER_ALIASES: Record<string, string> = {
  'name': 'name',
  'customer name': 'name',
  'customer': 'name',
  'user': 'name',
  'username': 'name',
  'full name': 'name',
  'email': 'email',
  'e-mail': 'email',
  'email address': 'email',
  'mail': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'tel': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'contact': 'phone',
  'notes': 'company',
  'note': 'company',
  'company': 'company',
  'business': 'company',
  'organization': 'company',
  'org': 'company',
  'status': 'subscription_status',
  'subscription status': 'subscription_status',
  'subscription_status': 'subscription_status',
  'state': 'subscription_status',
  'live plan': 'subscription_plan',
  'live_plan': 'subscription_plan',
  'subscription plan': 'subscription_plan',
  'subscription_plan': 'subscription_plan',
  'plan': 'subscription_plan',
  'package': 'subscription_plan',
  'tier': 'subscription_plan',
  'live start': 'subscription_start_date',
  'live_start': 'subscription_start_date',
  'subscription start': 'subscription_start_date',
  'subscription_start_date': 'subscription_start_date',
  'start date': 'subscription_start_date',
  'start_date': 'subscription_start_date',
  'live end': 'subscription_end_date',
  'live_end': 'subscription_end_date',
  'live expiry': 'subscription_end_date',
  'live_expiry': 'subscription_end_date',
  'subscription end': 'subscription_end_date',
  'subscription_end_date': 'subscription_end_date',
  'end date': 'subscription_end_date',
  'end_date': 'subscription_end_date',
  'expiry': 'subscription_end_date',
  'expiry date': 'subscription_end_date',
  'vod plan': 'vod_plan',
  'vod_plan': 'vod_plan',
  'vod package': 'vod_package',
  'vod_package': 'vod_plan',
  'vod tier': 'vod_plan',
  'vod_tier': 'vod_plan',
  'vod start': 'vod_start_date',
  'vod_start': 'vod_start_date',
  'vod_start_date': 'vod_start_date',
  'vod start date': 'vod_start_date',
  'vod end': 'vod_end_date',
  'vod_end': 'vod_end_date',
  'vod expiry': 'vod_end_date',
  'vod_expiry': 'vod_end_date',
  'vod_end_date': 'vod_end_date',
  'vod end date': 'vod_end_date',
  'price': 'total_spent',
  'total spent': 'total_spent',
  'total_spent': 'total_spent',
  'spent': 'total_spent',
  'revenue': 'total_spent',
  'amount': 'total_spent',
  'balance': 'total_spent',
  'credits': 'total_spent',
  'service': 'service',
  'service type': 'service',
  'device': 'device',
  'device type': 'device',
  'devices': 'device',
  'trial': 'has_trial',
  'has trial': 'has_trial',
  'has_trial': 'has_trial',
  'live trial': 'has_live_trial',
  'live_trial': 'has_live_trial',
  'has live trial': 'has_live_trial',
  'has_live_trial': 'has_live_trial',
  'vod trial': 'has_vod_trial',
  'vod_trial': 'has_vod_trial',
  'has vod trial': 'has_vod_trial',
  'has_vod_trial': 'has_vod_trial',
};

interface ParsedCustomer {
  [key: string]: string | number;
}

/** Build a mapping from CSV header → internal field name */
function buildHeaderMapping(csvHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of csvHeaders) {
    const normalized = header.trim().toLowerCase();
    if (HEADER_ALIASES[normalized]) {
      mapping[header] = HEADER_ALIASES[normalized];
    }
  }
  return mapping;
}

interface ImportCustomersDialogProps {
  onOpenChange?: (open: boolean) => void;
}

export function ImportCustomersDialog({ onOpenChange }: ImportCustomersDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { data: existingCustomers = [] } = useCustomers();

  // Reset all state when dialog opens
  const resetState = () => {
    setParsedData([]);
    setColumns([]);
    setValidationErrors([]);
    setHeaderMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) resetState();
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

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
    setHeaderMapping({});

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

        const csvHeaders = Object.keys(data[0]);
        const mapping = buildHeaderMapping(csvHeaders);
        setHeaderMapping(mapping);
        setColumns(csvHeaders);
        setParsedData(data);
        
        const mappedCount = Object.keys(mapping).length;
        const unmappedCount = csvHeaders.length - mappedCount;
        
        toast({
          title: 'File Parsed',
          description: `Found ${data.length} records. ${mappedCount} columns mapped${unmappedCount > 0 ? `, ${unmappedCount} unrecognised (will be skipped)` : ''}.`,
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
    // Use the header mapping to pull values by internal field name
    const getField = (field: string): string => {
      for (const [csvHeader, mappedField] of Object.entries(headerMapping)) {
        if (mappedField === field && row[csvHeader] != null) {
          const val = String(row[csvHeader]).trim();
          if (val) return val;
        }
      }
      return '';
    };

    const getNumber = (field: string): number => {
      const val = getField(field);
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    const getDate = (field: string): string | null => {
      const val = getField(field);
      if (!val) return null;
      const parsed = Date.parse(val);
      return isNaN(parsed) ? null : new Date(parsed).toISOString().split('T')[0];
    };

    const getBool = (field: string): boolean => {
      const val = getField(field).toLowerCase();
      return val === 'yes' || val === 'true' || val === '1';
    };

    const status = getField('subscription_status').toLowerCase();
    let subscription_status: 'active' | 'trial' | 'expired' | 'cancelled' = 'active';
    if (status.includes('trial')) subscription_status = 'trial';
    else if (status.includes('expired') || status.includes('inactive')) subscription_status = 'expired';
    else if (status.includes('cancel')) subscription_status = 'cancelled';

    return {
      name: getField('name') || 'Unknown',
      email: getField('email') || null,
      phone: getField('phone') || null,
      company: getField('company') || null,
      subscription_status,
      subscription_plan: getField('subscription_plan') || null,
      subscription_start_date: getDate('subscription_start_date'),
      subscription_end_date: getDate('subscription_end_date'),
      vod_plan: getField('vod_plan') || null,
      vod_start_date: getDate('vod_start_date'),
      vod_end_date: getDate('vod_end_date'),
      total_spent: getNumber('total_spent'),
      service: getField('service') || null,
      device: getField('device') ? getField('device').split(',').map(d => d.trim()).filter(Boolean) : [],
      has_trial: getBool('has_trial'),
      has_live_trial: getBool('has_live_trial'),
      has_vod_trial: getBool('has_vod_trial'),
    };
  };

  // Find existing customer by email first, then by name
  const findExistingCustomer = (customer: ValidatedCustomer) => {
    if (customer.email) {
      const emailMatch = existingCustomers.find(
        existing => existing.email?.toLowerCase() === customer.email?.toLowerCase()
      );
      if (emailMatch) return emailMatch;
    }
    
    const nameMatch = existingCustomers.find(
      existing => existing.name.toLowerCase().trim() === customer.name.toLowerCase().trim()
    );
    return nameMatch || null;
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
      setValidationErrors(errors.slice(0, 10));
      toast({
        title: 'Validation Errors',
        description: errors.length > 10
          ? `${errors.length} validation errors found. Showing first 10.`
          : `${errors.length} validation errors found. Please fix and try again.`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    let created = 0;
    let updated = 0;
    
    for (const customer of validCustomers) {
      try {
        const existing = findExistingCustomer(customer);
        
        if (existing) {
          await updateCustomer.mutateAsync({ id: existing.id, ...customer });
          updated++;
        } else {
          await createCustomer.mutateAsync(customer);
          created++;
        }
      } catch (e) {
        console.error('Failed to import customer:', e);
      }
    }

    setIsLoading(false);
    
    toast({
      title: 'Import Complete',
      description: `Created ${created} new, updated ${updated} existing customers`,
    });
    
    setOpen(false);
    resetState();
  };

  const mappedFields = Object.values(headerMapping);
  const unmappedHeaders = columns.filter(h => !headerMapping[h]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = '';
              fileInputRef.current?.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {isLoading && !parsedData.length ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">
                  {parsedData.length > 0 ? 'Click to upload a different file' : 'Click to upload CSV or Excel file'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Export your customer list from ourpanel.live and upload it here
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {MAX_FILE_SIZE_MB}MB, up to {MAX_ROW_COUNT.toLocaleString()} rows
                </p>
              </div>
            )}
          </div>

          {/* Column Mapping Preview */}
          {parsedData.length > 0 && Object.keys(headerMapping).length > 0 && (
            <div className="border rounded-md p-3 bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Column Mapping:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(headerMapping).map(([csv, field]) => (
                  <span key={csv} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                    <Check className="h-3 w-3" />
                    {csv} → {field}
                  </span>
                ))}
              </div>
              {unmappedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Skipped columns: {unmappedHeaders.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="border border-destructive rounded-md p-4 bg-destructive/10">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-destructive">Validation Errors:</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={resetState}
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear & Try Again
                </Button>
              </div>
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
                <Button onClick={handleImport} className="gap-2" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
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
