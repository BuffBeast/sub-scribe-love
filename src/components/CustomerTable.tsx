import { useState } from 'react';
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
import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useDeleteCustomer } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const { data: columns = [] } = useColumnVisibility();
  const { data: customFields = [] } = useCustomFields();
  const deleteCustomer = useDeleteCustomer();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Default columns to show when no visibility settings exist
  const defaultColumns = ['name', 'email', 'company', 'subscription_plan', 'subscription_status', 'last_contact_date', 'total_spent'];
  
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
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
              {visibleColumns.includes('company') && <TableHead className="font-semibold">Company</TableHead>}
              {visibleColumns.includes('subscription_plan') && <TableHead className="font-semibold">Plan</TableHead>}
              {visibleColumns.includes('subscription_status') && <TableHead className="font-semibold">Status</TableHead>}
              {visibleColumns.includes('last_contact_date') && <TableHead className="font-semibold">Last Contact</TableHead>}
              {visibleColumns.includes('total_spent') && <TableHead className="font-semibold text-right">Total Spent</TableHead>}
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
                {visibleColumns.includes('company') && (
                  <TableCell className="text-muted-foreground">{customer.company || '-'}</TableCell>
                )}
                {visibleColumns.includes('subscription_plan') && (
                  <TableCell>
                    <span className="font-medium">{customer.subscription_plan || '-'}</span>
                  </TableCell>
                )}
                {visibleColumns.includes('subscription_status') && (
                  <TableCell>
                    <StatusBadge status={customer.subscription_status as any || 'active'} />
                  </TableCell>
                )}
                {visibleColumns.includes('last_contact_date') && (
                  <TableCell className="text-muted-foreground">
                    {customer.last_contact_date
                      ? formatDistanceToNow(new Date(customer.last_contact_date), { addSuffix: true })
                      : '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('total_spent') && (
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.total_spent)}
                  </TableCell>
                )}
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
      </Card>
    </div>
  );
}
