import { useState } from 'react';
import { format } from 'date-fns';
import { Customer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { StatusBadge } from './StatusBadge';
import { SendEmailDialog } from './SendEmailDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, Bell, BellOff, Trash2, ChevronRight, CalendarIcon, Mail } from 'lucide-react';
import { useAllDeviceOptions } from '@/hooks/useDeviceTypes';
import { useAllServiceOptions } from '@/hooks/useServiceTypes';
import { cn } from '@/lib/utils';

interface MobileCustomerCardProps {
  customer: Customer;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (customer: Customer) => void;
}

export function MobileCustomerCard({ customer, selected, onSelect, onClick }: MobileCustomerCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const deviceOptions = useAllDeviceOptions();
  const serviceOptions = useAllServiceOptions();

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleDelete = () => {
    deleteCustomer.mutate(customer.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <SendEmailDialog 
        customer={customer} 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen} 
      />
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Card className="p-4 space-y-3">
      {/* Header Row: Checkbox, Avatar, Name, Status */}
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

      {/* Service & Device Dropdowns */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Service</span>
          <Select
            value={customer.service || 'none'}
            onValueChange={(value) => {
              updateCustomer.mutate({
                id: customer.id,
                service: value === 'none' ? null : value,
              });
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {serviceOptions.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Device</span>
          <Select
            value={customer.device || 'none'}
            onValueChange={(value) => {
              updateCustomer.mutate({
                id: customer.id,
                device: value === 'none' ? null : value,
              });
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {deviceOptions.map((device) => (
                <SelectItem key={device} value={device}>
                  {device}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggle Buttons: Trial, LIVE, VOD, Reminders */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">Trial</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({ id: customer.id, has_trial: !customer.has_trial });
            }}
          >
            {customer.has_trial ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">LIVE</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                subscription_plan: customer.subscription_plan ? null : 'Active',
              });
            }}
          >
            {customer.subscription_plan ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <X className="h-5 w-5 text-destructive" />
            )}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">VOD</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                vod_plan: customer.vod_plan ? null : 'Active',
              });
            }}
          >
            {customer.vod_plan ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <X className="h-5 w-5 text-destructive" />
            )}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">Remind</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              updateCustomer.mutate({
                id: customer.id,
                reminders_enabled: !customer.reminders_enabled,
              });
            }}
          >
            {customer.reminders_enabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Expiry Dates with Calendar Pickers */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">LIVE Exp:</span>
          <Popover modal>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-normal">
                {customer.subscription_end_date
                  ? format(new Date(customer.subscription_end_date), 'MM/dd/yy')
                  : <span className="text-muted-foreground">-</span>}
                <CalendarIcon className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customer.subscription_end_date ? new Date(customer.subscription_end_date) : undefined}
                onSelect={(date) => {
                  updateCustomer.mutate({
                    id: customer.id,
                    subscription_end_date: date ? format(date, 'yyyy-MM-dd') : null,
                  });
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">VOD Exp:</span>
          <Popover modal>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-normal">
                {customer.vod_end_date
                  ? format(new Date(customer.vod_end_date), 'MM/dd/yy')
                  : <span className="text-muted-foreground">-</span>}
                <CalendarIcon className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customer.vod_end_date ? new Date(customer.vod_end_date) : undefined}
                onSelect={(date) => {
                  updateCustomer.mutate({
                    id: customer.id,
                    vod_end_date: date ? format(date, 'yyyy-MM-dd') : null,
                  });
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Notes */}
      {customer.company && (
        <div className="text-xs">
          <span className="text-muted-foreground">Notes: </span>
          <span>{customer.company}</span>
        </div>
      )}

      {/* Footer: Delete, Email & Edit buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <div className="flex items-center gap-1">
          {customer.email && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEmailDialogOpen(true);
              }}
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClick(customer)}
          >
            Edit
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
    </>
  );
}
