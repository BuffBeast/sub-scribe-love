import { SubscriptionStatus } from '@/types/customer';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

const statusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success border-success/20',
  },
  trial: {
    label: 'Trial',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
