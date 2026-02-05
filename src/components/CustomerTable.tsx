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
import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useDeleteCustomer } from '@/hooks/useCustomers';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const { data: columns = [] } = useColumnVisibility();
  const { data: customFields = [] } = useCustomFields();
  const deleteCustomer = useDeleteCustomer();

  const visibleColumns = columns.filter((c) => c.is_visible).map((c) => c.column_name);
  const visibleCustomFields = customFields.filter((f) => f.is_visible);

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

  return (
    <Card className="shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
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
  );
}
