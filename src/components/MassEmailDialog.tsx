import { useState, useMemo } from 'react';
import { Mail, Send, Users, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Customer } from '@/hooks/useCustomers';
import { z } from 'zod';

const emailSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().trim().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
});

interface MassEmailDialogProps {
  customers: Customer[];
}

export function MassEmailDialog({ customers }: MassEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const customersWithEmail = useMemo(
    () => customers.filter(c => c.email),
    [customers]
  );

  // Initialize selection when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Select all customers by default when opening
      setSelectedCustomerIds(new Set(customersWithEmail.map(c => c.id)));
    }
  };

  const selectedCount = selectedCustomerIds.size;
  const allSelected = selectedCount === customersWithEmail.length && customersWithEmail.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < customersWithEmail.length;

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCustomerIds(new Set(customersWithEmail.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleSend = async () => {
    // Validate inputs
    const result = emailSchema.safeParse({ subject, message });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (selectedCount === 0) {
      toast.error('Please select at least one customer to send to');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to send emails');
        return;
      }

      const response = await supabase.functions.invoke('send-mass-email', {
        body: { 
          subject, 
          message,
          customerIds: Array.from(selectedCustomerIds)
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send emails');
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success > 0) {
        toast.success(`Successfully sent ${data.success} email${data.success > 1 ? 's' : ''}!`);
      }

      if (data.failed > 0) {
        toast.error(`Failed to send ${data.failed} email${data.failed > 1 ? 's' : ''}`);
      }

      // Reset form and close dialog
      setSubject('');
      setMessage('');
      setSelectedCustomerIds(new Set());
      setOpen(false);
    } catch (error) {
      console.error('Error sending mass email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Mass Email</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Mass Email
          </DialogTitle>
          <DialogDescription>
            Select customers and send them an announcement or update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Recipient Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipients</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="h-7 px-2 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                  className="h-7 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Deselect All
                </Button>
              </div>
            </div>
            
            {customersWithEmail.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No customers with email addresses found.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {customersWithEmail.map((customer) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCustomerIds.has(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                      />
                      <span className="text-sm flex-1 truncate">{customer.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {customer.email}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedCount}</strong> of {customersWithEmail.length} customer{customersWithEmail.length !== 1 ? 's' : ''} selected.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Important announcement..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              placeholder="Hi {name},&#10;&#10;We have an exciting announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 min-h-[120px]"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{name}'}</code> to personalize with customer name, 
              <code className="bg-muted px-1 rounded ml-1">{'{plan}'}</code> for their subscription plan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || selectedCount === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedCount} {selectedCount === 1 ? 'Customer' : 'Customers'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
