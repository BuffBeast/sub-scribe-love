import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Bell } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendEmailDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendEmailDialog({ customer, open, onOpenChange }: SendEmailDialogProps) {
  const { toast } = useToast();
  const { data: settings } = useAppSettings();
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'compose' | 'reminder'>('compose');
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSendCompose = async () => {
    if (!customer?.email) {
      toast({ title: 'No email address', description: 'This customer has no email address.', variant: 'destructive' });
      return;
    }
    
    if (!subject.trim()) {
      toast({ title: 'Subject required', variant: 'destructive' });
      return;
    }
    
    if (!message.trim()) {
      toast({ title: 'Message required', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('send-single-email', {
        body: {
          email: customer.email,
          subject: subject.trim(),
          message: message.trim(),
          customerName: customer.name,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send email');
      }

      toast({ title: 'Email sent!', description: `Email sent to ${customer.email}` });
      setSubject('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: 'Failed to send email', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async () => {
    if (!customer?.email) {
      toast({ title: 'No email address', description: 'This customer has no email address.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }

      // Use reminder template from settings
      const reminderSubject = settings?.reminder_subject || 'Your subscription expires soon';
      let reminderMessage = settings?.reminder_message || 
        'Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!';
      
      // Format date
      const formattedDate = customer.subscription_end_date 
        ? format(new Date(customer.subscription_end_date), 'MMMM d, yyyy')
        : 'N/A';
      
      // Replace placeholders
      reminderMessage = reminderMessage
        .replace(/\{name\}/g, customer.name)
        .replace(/\{plan\}/g, customer.subscription_plan || 'subscription')
        .replace(/\{date\}/g, formattedDate);

      const response = await supabase.functions.invoke('send-single-email', {
        body: {
          email: customer.email,
          subject: reminderSubject,
          message: reminderMessage,
          customerName: customer.name,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send reminder');
      }

      toast({ title: 'Reminder sent!', description: `Reminder sent to ${customer.email}` });
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: 'Failed to send reminder', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {customer.name}
          </DialogTitle>
          <DialogDescription>
            {customer.email || 'No email address on file'}
          </DialogDescription>
        </DialogHeader>

        {!customer.email ? (
          <div className="py-8 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>This customer doesn't have an email address.</p>
            <p className="text-sm mt-1">Add an email address to send them messages.</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'compose' | 'reminder')} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="gap-2">
                <Send className="h-4 w-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="reminder" className="gap-2">
                <Bell className="h-4 w-4" />
                Quick Reminder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  maxLength={200}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-message">Message</Label>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  maxLength={10000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/10000
                </p>
              </div>

              <Button 
                onClick={handleSendCompose} 
                disabled={sending || !subject.trim() || !message.trim()}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
            </TabsContent>

            <TabsContent value="reminder" className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium">Subject:</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.reminder_subject || 'Your subscription expires soon'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Preview:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {(settings?.reminder_message || 'Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!')
                      .replace(/\{name\}/g, customer.name)
                      .replace(/\{plan\}/g, customer.subscription_plan || 'subscription')
                      .replace(/\{date\}/g, customer.subscription_end_date 
                        ? format(new Date(customer.subscription_end_date), 'MMMM d, yyyy')
                        : 'N/A'
                      )}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This uses your configured reminder template from Branding Settings.
              </p>

              <Button 
                onClick={handleSendReminder} 
                disabled={sending}
                className="w-full gap-2"
              >
                <Bell className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Reminder'}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
