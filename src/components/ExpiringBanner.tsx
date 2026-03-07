import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { isExpiringSoon } from '@/lib/dateUtils';

interface ExpiringBannerProps {
  customers: Customer[];
  onFilterExpiring?: () => void;
}

export function ExpiringBanner({ customers, onFilterExpiring }: ExpiringBannerProps) {
  const expiringThisWeek = useMemo(() => {
    return customers.filter(c => {
      if (c.subscription_status === 'expired' || c.subscription_status === 'cancelled') return false;
      return isExpiringSoon(c.subscription_end_date, 7) || isExpiringSoon(c.vod_end_date, 7);
    });
  }, [customers]);

  if (expiringThisWeek.length === 0) return null;

  const names = expiringThisWeek.slice(0, 3).map(c => c.name);
  const remaining = expiringThisWeek.length - names.length;

  return (
    <button
      type="button"
      onClick={onFilterExpiring}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-left transition-colors hover:bg-amber-500/20 group"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {expiringThisWeek.length} customer{expiringThisWeek.length !== 1 ? 's' : ''} expiring this week
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {names.join(', ')}{remaining > 0 ? ` +${remaining} more` : ''}
        </p>
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
        View →
      </span>
    </button>
  );
}
