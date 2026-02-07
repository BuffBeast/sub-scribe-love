import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Bell, Paperclip, X } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendEmailDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Attachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function SendEmailDialog({ customer, open, onOpenChange }: SendEmailDialogProps) {
  const { toast } = useToast();
  const { data: settings } = useAppSettings();
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'compose' | 'reminder'>('compose');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ 
          title: 'File too large', 
          description: `${file.name} exceeds 5MB limit`,
          variant: 'destructive' 
        });
        continue;
      }

      // Check if already attached
      if (attachments.some(a => a.filename === file.name)) {
        toast({ 
          title: 'Already attached', 
          description: `${file.name} is already attached`,
          variant: 'destructive' 
        });
        continue;
      }

      // Convert to base64
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (filename: string) => {
    setAttachments(prev => prev.filter(a => a.filename !== filename));
  };

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
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send email');
      }

      toast({ title: 'Email sent!', description: `Email sent to ${customer.email}` });
      setSubject('');
      setMessage('');
      setAttachments([]);
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
      const appName = settings?.app_name || "Let's Stream";
      let reminderSubject = settings?.reminder_subject || 'Your subscription expires soon';
      let reminderMessage = settings?.reminder_message || 
        'Hi {name},\n\nYour {plan} subscription expires on {date}.\n\nPlease renew to continue your service.\n\nThank you!';
      
      // Format date
      const formattedDate = customer.subscription_end_date 
        ? format(new Date(customer.subscription_end_date), 'MMMM d, yyyy')
        : 'N/A';
      
      // Replace placeholders in subject and message
      reminderSubject = reminderSubject.replace(/\{app_name\}/g, appName);
      reminderMessage = reminderMessage
        .replace(/\{name\}/g, customer.name)
        .replace(/\{plan\}/g, customer.subscription_plan || 'subscription')
        .replace(/\{date\}/g, formattedDate)
        .replace(/\{app_name\}/g, appName);

      const response = await supabase.functions.invoke('send-single-email', {
        body: {
          email: customer.email,
          subject: reminderSubject,
          message: reminderMessage,
          customerName: customer.name,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send reminder');
      }

      toast({ title: 'Reminder sent!', description: `Reminder sent to ${customer.email}` });
      setAttachments([]);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

              {/* Attachments Section */}
              <div className="space-y-2">
                <Label>Attachments</Label>
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
                <p className="text-xs text-muted-foreground">Max 5MB per file</p>

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

              <Button 
                onClick={handleSendCompose} 
                disabled={sending || !subject.trim() || !message.trim()}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : `Send Email${attachments.length > 0 ? ` (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})` : ''}`}
              </Button>
            </TabsContent>

            <TabsContent value="reminder" className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium">Subject:</p>
                  <p className="text-sm text-muted-foreground">
                    {(settings?.reminder_subject || 'Your subscription expires soon')
                      .replace(/\{app_name\}/g, settings?.app_name || "Let's Stream")}
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
                      )
                      .replace(/\{app_name\}/g, settings?.app_name || "Let's Stream")}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This uses your configured reminder template from Branding Settings.
              </p>

              {/* Attachments Section */}
              <div className="space-y-2">
                <Label>Attachments (optional)</Label>
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
                <p className="text-xs text-muted-foreground">Max 5MB per file</p>

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

              <Button 
                onClick={handleSendReminder} 
                disabled={sending}
                className="w-full gap-2"
              >
                <Bell className="h-4 w-4" />
                {sending ? 'Sending...' : `Send Reminder${attachments.length > 0 ? ` (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})` : ''}`}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
