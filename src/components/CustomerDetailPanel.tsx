import { Customer } from '@/types/customer';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  CreditCard,
  X,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomerDetailPanelProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="shadow-elevated h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <p className="text-muted-foreground">{customer.company}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Contact Information
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{customer.company}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Subscription Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Subscription
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={customer.subscriptionStatus} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-medium">{customer.subscriptionPlan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Started</span>
              <span className="text-sm">
                {format(new Date(customer.subscriptionStartDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires</span>
              <span className="text-sm">
                {format(new Date(customer.subscriptionEndDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Financial */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Financial
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Spent</span>
            </div>
            <span className="text-lg font-bold">{formatCurrency(customer.totalSpent)}</span>
          </div>
        </div>

        <Separator />

        {/* Last Contact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last Contact</span>
            </div>
            <span className="text-sm">
              {format(new Date(customer.lastContactDate), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-2">
          <Button className="w-full gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Button>
          <Button variant="outline" className="w-full">
            View Full Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
