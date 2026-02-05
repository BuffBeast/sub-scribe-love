import { Customer } from '@/types/customer';
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
import { formatDistanceToNow } from 'date-fns';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
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
    <Card className="shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Plan</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Last Contact</TableHead>
            <TableHead className="font-semibold text-right">Total Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onCustomerClick?.(customer)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.company}</TableCell>
              <TableCell>
                <span className="font-medium">{customer.subscriptionPlan}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={customer.subscriptionStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(customer.lastContactDate), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(customer.totalSpent)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
