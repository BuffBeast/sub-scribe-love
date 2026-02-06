import { useState } from 'react';
import { Mail, Send, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

  const customersWithEmail = customers.filter(c => c.email);
  const recipientCount = customersWithEmail.length;

  const handleSend = async () => {
    // Validate inputs
    const result = emailSchema.safeParse({ subject, message });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (recipientCount === 0) {
      toast.error('No customers with email addresses to send to');
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
        body: { subject, message },
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
      setOpen(false);
    } catch (error) {
      console.error('Error sending mass email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Mass Email</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Mass Email
          </DialogTitle>
          <DialogDescription>
            Send an announcement or update to all your customers with email addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              This email will be sent to <strong>{recipientCount}</strong> customer{recipientCount !== 1 ? 's' : ''} with email addresses.
            </AlertDescription>
          </Alert>

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

          <div className="space-y-2">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              placeholder="Hi {name},&#10;&#10;We have an exciting announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
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
          <Button onClick={handleSend} disabled={loading || recipientCount === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {recipientCount} {recipientCount === 1 ? 'Customer' : 'Customers'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
