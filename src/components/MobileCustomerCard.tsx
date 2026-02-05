import { format } from 'date-fns';
import { Customer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { StatusBadge } from './StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Bell, BellOff, Trash2, ChevronRight } from 'lucide-react';

interface MobileCustomerCardProps {
  customer: Customer;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (customer: Customer) => void;
}

export function MobileCustomerCard({ customer, selected, onSelect, onClick }: MobileCustomerCardProps) {
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(customer.id)}
          aria-label={`Select ${customer.name}`}
        />
        <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
            {getInitials(customer.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0" onClick={() => onClick(customer)}>
          <p className="font-semibold truncate">{customer.name}</p>
          {customer.email && (
            <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
          )}
        </div>
        <StatusBadge status={customer.subscription_status as any || 'active'} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Trial:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({ id: customer.id, has_trial: !customer.has_trial });
            }}
          >
            {customer.has_trial ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">LIVE:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                subscription_plan: customer.subscription_plan ? null : 'Active',
              });
            }}
          >
            {customer.subscription_plan ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">VOD:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                vod_plan: customer.vod_plan ? null : 'Active',
              });
            }}
          >
            {customer.vod_plan ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Reminders:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                reminders_enabled: !customer.reminders_enabled,
              });
            }}
          >
            {customer.reminders_enabled ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {(customer.subscription_end_date || customer.vod_end_date) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {customer.subscription_end_date && (
            <span className="bg-muted px-2 py-1 rounded">
              LIVE expires: {format(new Date(customer.subscription_end_date), 'MM/dd/yyyy')}
            </span>
          )}
          {customer.vod_end_date && (
            <span className="bg-muted px-2 py-1 rounded">
              VOD expires: {format(new Date(customer.vod_end_date), 'MM/dd/yyyy')}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            deleteCustomer.mutate(customer.id);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onClick(customer)}
        >
          Edit
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
