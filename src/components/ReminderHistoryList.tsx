import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Mail, Send, Bell, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useReminderHistory } from '@/hooks/useReminderHistory';

const REMINDER_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'expiry', label: 'Auto Reminder' },
  { value: 'manual_reminder', label: 'Quick Reminder' },
  { value: 'individual', label: 'Individual' },
  { value: 'mass_email', label: 'Mass Email' },
] as const;

function getReminderTypeInfo(type: string) {
  switch (type) {
    case 'mass_email':
      return { label: 'Mass Email', icon: Megaphone, variant: 'outline' as const };
    case 'individual':
      return { label: 'Individual', icon: Send, variant: 'outline' as const };
    case 'manual_reminder':
      return { label: 'Quick Reminder', icon: Bell, variant: 'outline' as const };
    case 'expiry':
    default:
      return { label: 'Auto Reminder', icon: Clock, variant: 'secondary' as const };
  }
}

export function ReminderHistoryList() {
  const { data: history, isLoading } = useReminderHistory();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredHistory = activeFilter === 'all'
    ? history
    : history?.filter(e => e.reminder_type === activeFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        <Clock className="h-4 w-4 mr-2 animate-spin" />
        Loading history...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No emails sent yet</p>
        <p className="text-xs mt-1">History will appear here after emails are sent</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {REMINDER_TYPES.map(t => (
          <Button
            key={t.value}
            variant={activeFilter === t.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setActiveFilter(t.value)}
          >
            {t.label}
            {t.value === 'all'
              ? ` (${history.length})`
              : ` (${history.filter(e => e.reminder_type === t.value).length})`}
          </Button>
        ))}
      </div>

      {(!filteredHistory || filteredHistory.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <p className="text-sm">No entries for this filter</p>
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-3">
            {filteredHistory.map((entry) => {
              const typeInfo = getReminderTypeInfo(entry.reminder_type);
              const TypeIcon = typeInfo.icon;
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {entry.status === 'sent' ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{entry.customer_name}</span>
                      <Badge variant={typeInfo.variant} className="text-xs gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {typeInfo.label}
                      </Badge>
                      {entry.plan_description && entry.reminder_type === 'expiry' && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.plan_description}
                        </Badge>
                      )}
                    </div>
                    {entry.reminder_type !== 'expiry' && entry.plan_description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Subject: {entry.plan_description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{entry.customer_email}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(entry.sent_at), 'MMM d, yyyy h:mm a')}</span>
                      {entry.expiry_date && (
                        <>
                          <span>•</span>
                          <span>Expires {format(new Date(entry.expiry_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    {entry.status === 'failed' && entry.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{entry.error_message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
