import { useState } from 'react';
import { format } from 'date-fns';
import { Customer } from '@/hooks/useCustomers';
import { StatusBadge } from './StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Check, X, Bell, BellOff, CalendarIcon } from 'lucide-react';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';

import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useDeleteCustomer } from '@/hooks/useCustomers';
import { useAllDeviceOptions } from '@/hooks/useDeviceTypes';
import { useToast } from '@/hooks/use-toast';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const { data: columns = [] } = useColumnVisibility();
  const { data: customFields = [] } = useCustomFields();
  const deviceOptions = useAllDeviceOptions();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Default columns to show when no visibility settings exist
  const defaultColumns = ['name', 'email', 'subscription_plan', 'subscription_start_date', 'subscription_end_date', 'vod_plan', 'vod_start_date', 'vod_end_date', 'company', 'subscription_status'];
  
  // If no column visibility settings exist, show all default columns
  const visibleColumns = columns.length > 0 
    ? columns.filter((c) => c.is_visible).map((c) => c.column_name)
    : defaultColumns;
  const visibleCustomFields = customFields.filter((f) => f.is_visible);

  const allSelected = customers.length > 0 && selectedIds.size === customers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };


  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomer.mutate(id);
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      try {
        await deleteCustomer.mutateAsync(id);
      } catch (e) {
        console.error('Failed to delete customer:', e);
      }
    }
    setSelectedIds(new Set());
    toast({ title: `Deleted ${count} customer${count > 1 ? 's' : ''}` });
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={deleteCustomer.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
        </div>
      )}

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(ref) => {
                    if (ref) {
                      (ref as any).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              {visibleColumns.includes('name') && <TableHead className="font-semibold">Customer</TableHead>}
              <TableHead className="font-semibold text-center">TRIAL</TableHead>
              {visibleColumns.includes('subscription_plan') && <TableHead className="font-semibold text-center">LIVE</TableHead>}
              {visibleColumns.includes('subscription_start_date') && <TableHead className="font-semibold">Start Date</TableHead>}
              {visibleColumns.includes('subscription_end_date') && <TableHead className="font-semibold">Expiry</TableHead>}
              {visibleColumns.includes('vod_plan') && <TableHead className="font-semibold">VOD</TableHead>}
              {visibleColumns.includes('vod_start_date') && <TableHead className="font-semibold">Start Date</TableHead>}
              {visibleColumns.includes('vod_end_date') && <TableHead className="font-semibold">Expiry</TableHead>}
              {visibleColumns.includes('company') && <TableHead className="font-semibold">Notes</TableHead>}
              <TableHead className="font-semibold">Device</TableHead>
              {visibleColumns.includes('subscription_status') && <TableHead className="font-semibold">Status</TableHead>}
              <TableHead className="font-semibold text-center">Reminders</TableHead>
              {visibleCustomFields.map((field) => (
                <TableHead key={field.id} className="font-semibold">{field.name}</TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onCustomerClick?.(customer)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(customer.id)) {
                          next.delete(customer.id);
                        } else {
                          next.add(customer.id);
                        }
                        return next;
                      });
                    }}
                    aria-label={`Select ${customer.name}`}
                  />
                </TableCell>
                {visibleColumns.includes('name') && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {visibleColumns.includes('email') && customer.email && (
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      updateCustomer.mutate({
                        id: customer.id,
                        has_trial: !customer.has_trial,
                      });
                    }}
                  >
                    {customer.has_trial ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                {visibleColumns.includes('subscription_plan') && (
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
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
                  </TableCell>
                )}
                {visibleColumns.includes('subscription_start_date') && (
                  <TableCell className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                          {customer.subscription_start_date
                            ? format(new Date(customer.subscription_start_date), 'MM/dd/yyyy')
                            : <span className="text-muted-foreground">-</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customer.subscription_start_date ? new Date(customer.subscription_start_date) : undefined}
                          onSelect={(date) => {
                            updateCustomer.mutate({
                              id: customer.id,
                              subscription_start_date: date ? format(date, 'yyyy-MM-dd') : null,
                            });
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                )}
                {visibleColumns.includes('subscription_end_date') && (
                  <TableCell className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                          {customer.subscription_end_date
                            ? format(new Date(customer.subscription_end_date), 'MM/dd/yyyy')
                            : <span className="text-muted-foreground">-</span>}
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
                  </TableCell>
                )}
                {visibleColumns.includes('vod_plan') && (
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
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
                  </TableCell>
                )}
                {visibleColumns.includes('vod_start_date') && (
                  <TableCell className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                          {customer.vod_start_date
                            ? format(new Date(customer.vod_start_date), 'MM/dd/yyyy')
                            : <span className="text-muted-foreground">-</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customer.vod_start_date ? new Date(customer.vod_start_date) : undefined}
                          onSelect={(date) => {
                            updateCustomer.mutate({
                              id: customer.id,
                              vod_start_date: date ? format(date, 'yyyy-MM-dd') : null,
                            });
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                )}
                {visibleColumns.includes('vod_end_date') && (
                  <TableCell className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                          {customer.vod_end_date
                            ? format(new Date(customer.vod_end_date), 'MM/dd/yyyy')
                            : <span className="text-muted-foreground">-</span>}
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
                  </TableCell>
                )}
                {visibleColumns.includes('company') && (
                  <TableCell className="text-muted-foreground">{customer.company || '-'}</TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={customer.device || ''}
                    onValueChange={(value) => {
                      updateCustomer.mutate({
                        id: customer.id,
                        device: value || null,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[110px]">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {deviceOptions.map((device) => (
                        <SelectItem key={device} value={device}>
                          {device}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {visibleColumns.includes('subscription_status') && (
                  <TableCell>
                    <StatusBadge status={customer.subscription_status as any || 'active'} />
                  </TableCell>
                )}
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
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
                </TableCell>
                {visibleCustomFields.map((field) => (
                  <TableCell key={field.id}>
                    {(customer.custom_data as Record<string, unknown>)?.[field.name]?.toString() || '-'}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleDelete(e, customer.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
