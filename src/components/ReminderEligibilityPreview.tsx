import { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, AlertTriangle, XCircle, Mail, MailX, BellOff, CalendarOff, FileX, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCustomers, useUpdateCustomer } from '@/hooks/useCustomers';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useReminderHistory } from '@/hooks/useReminderHistory';
import { toast } from 'sonner';

type SkipReason =
  | 'no_email'
  | 'reminders_disabled'
  | 'not_in_window'
  | 'no_plan'
  | 'already_reminded'
  | 'expired';

interface EligibilityResult {
  id: string;
  name: string;
  email: string | null;
  eligible: boolean;
  skipReasons: SkipReason[];
  liveExpiring: boolean;
  vodExpiring: boolean;
  liveDate: string | null;
  vodDate: string | null;
}

function getSkipInfo(reason: SkipReason) {
  switch (reason) {
    case 'no_email':
      return { label: 'No email address', icon: MailX, color: 'text-destructive' };
    case 'reminders_disabled':
      return { label: 'Reminders disabled', icon: BellOff, color: 'text-destructive' };
    case 'not_in_window':
      return { label: 'Not expiring within window', icon: CalendarOff, color: 'text-muted-foreground' };
    case 'no_plan':
      return { label: 'No subscription plan set', icon: FileX, color: 'text-muted-foreground' };
    case 'already_reminded':
      return { label: 'Already reminded recently', icon: Mail, color: 'text-amber-500' };
    case 'expired':
      return { label: 'Already expired', icon: XCircle, color: 'text-muted-foreground' };
  }
}

export function ReminderEligibilityPreview() {
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const { data: settings } = useAppSettings();
  const { data: history } = useReminderHistory();
  const updateCustomer = useUpdateCustomer();
  const { data: history } = useReminderHistory();

  const reminderDays = settings?.reminder_days ?? 30;

  const results = useMemo(() => {
    if (!customers) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + reminderDays);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Build set of customer IDs already reminded within window
    const alreadyRemindedIds = new Set<string>();
    if (history) {
      const windowStart = new Date(today.getTime() - reminderDays * 24 * 60 * 60 * 1000).toISOString();
      history
        .filter(h => h.reminder_type === 'expiry' && h.status === 'sent' && h.sent_at >= windowStart)
        .forEach(h => alreadyRemindedIds.add(h.customer_id));
    }

    const eligibilityResults: EligibilityResult[] = customers.map(customer => {
      const skipReasons: SkipReason[] = [];

      // Check email
      if (!customer.email) {
        skipReasons.push('no_email');
      }

      // Check reminders toggle
      if (!customer.reminders_enabled) {
        skipReasons.push('reminders_disabled');
      }

      // Check if they have any plan
      const hasLive = !!customer.subscription_plan;
      const hasVod = !!customer.vod_plan;
      if (!hasLive && !hasVod) {
        skipReasons.push('no_plan');
      }

      // Check if within window
      const liveInWindow = hasLive && customer.subscription_end_date &&
        customer.subscription_end_date >= todayStr &&
        customer.subscription_end_date <= futureDateStr;

      const vodInWindow = hasVod && customer.vod_end_date &&
        customer.vod_end_date >= todayStr &&
        customer.vod_end_date <= futureDateStr;

      // Check if already expired (all plans past)
      const liveExpired = hasLive && customer.subscription_end_date && customer.subscription_end_date < todayStr;
      const vodExpired = hasVod && customer.vod_end_date && customer.vod_end_date < todayStr;
      const allExpired = (hasLive || hasVod) &&
        (!hasLive || liveExpired) &&
        (!hasVod || vodExpired);

      if (allExpired && (hasLive || hasVod)) {
        skipReasons.push('expired');
      } else if (!liveInWindow && !vodInWindow && (hasLive || hasVod)) {
        skipReasons.push('not_in_window');
      }

      // Check deduplication
      if (alreadyRemindedIds.has(customer.id)) {
        skipReasons.push('already_reminded');
      }

      const eligible = !!customer.email && customer.reminders_enabled &&
        (liveInWindow || vodInWindow) &&
        !alreadyRemindedIds.has(customer.id);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        eligible,
        skipReasons,
        liveExpiring: !!liveInWindow,
        vodExpiring: !!vodInWindow,
        liveDate: customer.subscription_end_date,
        vodDate: customer.vod_end_date,
      };
    });

    // Sort: eligible first, then by name
    return eligibilityResults.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [customers, reminderDays, history]);

  if (loadingCustomers) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const eligibleCount = results.filter(r => r.eligible).length;
  const skippedCount = results.filter(r => !r.eligible).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">{eligibleCount}</span>
          <span className="text-muted-foreground">eligible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{skippedCount}</span>
          <span className="text-muted-foreground">skipped</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          Window: next {reminderDays} day{reminderDays !== 1 ? 's' : ''}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <p className="text-sm">No customers found</p>
        </div>
      ) : (
        <ScrollArea className="h-[240px]">
          <div className="space-y-1.5 pr-3">
            {results.map((result) => (
              <div
                key={result.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                  result.eligible
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-card border-border'
                }`}
              >
                {result.eligible ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{result.name}</span>
                    {result.eligible && (
                      <>
                        {result.liveExpiring && (
                          <Badge variant="secondary" className="text-xs">LIVE</Badge>
                        )}
                        {result.vodExpiring && (
                          <Badge variant="secondary" className="text-xs">VOD</Badge>
                        )}
                      </>
                    )}
                  </div>
                  {result.email && (
                    <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                  )}
                  {result.eligible && (
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {result.liveExpiring && result.liveDate && (
                        <span>LIVE expires {format(new Date(result.liveDate + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      )}
                      {result.liveExpiring && result.vodExpiring && <span>•</span>}
                      {result.vodExpiring && result.vodDate && (
                        <span>VOD expires {format(new Date(result.vodDate + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  )}
                  {!result.eligible && result.skipReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {result.skipReasons.map(reason => {
                        const info = getSkipInfo(reason);
                        const Icon = info.icon;
                        return (
                          <span key={reason} className={`flex items-center gap-1 text-xs ${info.color}`}>
                            <Icon className="h-3 w-3" />
                            {info.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
