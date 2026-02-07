import { useState, useMemo, useRef } from 'react';
import { Mail, Send, Users, Loader2, Check, X, Paperclip } from 'lucide-react';
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

interface Attachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface MassEmailDialogProps {
  customers: Customer[];
}

export function MassEmailDialog({ customers }: MassEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAttachments([]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      if (attachments.some(a => a.filename === file.name)) {
        toast.error(`${file.name} is already attached`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          filename: file.name,
          content: base64,
          contentType: file.type || 'application/octet-stream',
        }]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (filename: string) => {
    setAttachments(prev => prev.filter(a => a.filename !== filename));
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
          customerIds: Array.from(selectedCustomerIds),
          attachments: attachments.length > 0 ? attachments : undefined,
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
      setAttachments([]);
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

          {/* Attachments Section */}
          <div className="space-y-2">
            <Label>Attachments (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              Attach File
            </Button>
            <p className="text-xs text-muted-foreground">Max 5MB per file. Same attachments sent to all recipients.</p>

            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.filename}
                    className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{attachment.filename}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeAttachment(attachment.filename)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
                {attachments.length > 0 && ` (${attachments.length} file${attachments.length > 1 ? 's' : ''})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
