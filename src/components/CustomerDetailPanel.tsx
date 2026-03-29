import { useState } from 'react';
import { Customer } from '@/hooks/useCustomers';
import { StatusBadge } from './StatusBadge';
import { SendEmailDialog } from './SendEmailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Phone, 
  Calendar, 
  X,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomerDetailPanelProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <>
      <SendEmailDialog 
        customer={customer} 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen} 
      />
      
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
                {customer.service && (
                  <p className="text-muted-foreground">{customer.service}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={customer.subscription_status as any || 'active'} />
          </div>

          {/* Contact Information */}
          {(customer.email || customer.phone) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Contact
                </h3>
                <div className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Subscription Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Subscriptions
            </h3>
            <div className="space-y-3">
              {/* LIVE */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LIVE</span>
                <span className="flex items-center gap-2">
                  {customer.subscription_plan ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      {customer.has_live_trial && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Trial</span>
                      )}
                      {customer.subscription_end_date && (
                        <span className="text-xs text-muted-foreground">
                          exp. {format(new Date(customer.subscription_end_date), 'MM/dd/yy')}
                        </span>
                      )}
                    </>
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </div>
              
              {/* VOD */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">VOD</span>
                <span className="flex items-center gap-2">
                  {customer.vod_plan ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      {customer.has_vod_trial && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Trial</span>
                      )}
                      {customer.vod_end_date && (
                        <span className="text-xs text-muted-foreground">
                          exp. {format(new Date(customer.vod_end_date), 'MM/dd/yy')}
                        </span>
                      )}
                    </>
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </div>
              
              {/* Device */}
              {Array.isArray(customer.device) && customer.device.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Device</span>
                  <span className="text-sm font-medium">{(customer.device as string[]).join(', ')}</span>
                </div>
              )}

              {/* Package */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connections</span>
                <span className="text-sm font-medium">{customer.connections}</span>
              </div>
              {Array.isArray(customer.selected_addons) && customer.selected_addons.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Add-Ons</span>
                  <span className="text-sm font-medium">{(customer.selected_addons as string[]).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Settings
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reminders</span>
              <span className="flex items-center gap-2">
                {customer.reminders_enabled ? (
                  <>
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-xs">Enabled</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Disabled</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Notes */}
          {customer.company && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Notes
                </h3>
                <p className="text-sm">{customer.company}</p>
              </div>
            </>
          )}

          {/* Last Updated */}
          <Separator />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Updated</span>
            </div>
            <span>{format(new Date(customer.updated_at), 'MMM d, yyyy')}</span>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button 
              className="w-full gap-2" 
              onClick={() => setEmailDialogOpen(true)}
              disabled={!customer.email}
            >
              <Send className="h-4 w-4" />
              Send Email
            </Button>
            {!customer.email && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Add an email address to send messages
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
