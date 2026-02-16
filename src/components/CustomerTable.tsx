import { useState, useCallback, ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { Customer } from '@/hooks/useCustomers';
import { StatusBadge } from './StatusBadge';
import { SendEmailDialog } from './SendEmailDialog';
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
import { Trash2, Check, X, Bell, BellOff, Mail, GripVertical } from 'lucide-react';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';

import { useOrderedColumns, useUpdateColumnOrder, COLUMN_LABELS } from '@/hooks/useColumnVisibility';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useDeleteCustomer } from '@/hooks/useCustomers';
import { useAllDeviceOptions } from '@/hooks/useDeviceTypes';
import { useAllServiceOptions } from '@/hooks/useServiceTypes';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

// Header labels that differ from COLUMN_LABELS
const HEADER_LABELS: Record<string, string> = {
  name: 'Customer',
  subscription_plan: 'LIVE',
  subscription_end_date: 'Expiry',
  has_trial: 'TRIAL',
  vod_end_date: 'Expiry',
  company: 'Notes',
  subscription_status: 'Status',
};

function SortableHeader({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead ref={setNodeRef} style={style} className={cn("font-semibold", className)}>
      <div className="flex items-center gap-1">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-3 w-3" />
        </button>
        {children}
      </div>
    </TableHead>
  );
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const orderedColumns = useOrderedColumns();
  const updateOrder = useUpdateColumnOrder();
  const { data: customFields = [] } = useCustomFields();
  const deviceOptions = useAllDeviceOptions();
  const serviceOptions = useAllServiceOptions();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null);

  const visibleColumns = orderedColumns.filter((c) => c.is_visible).map((c) => c.column_name);
  const visibleCustomFields = customFields.filter((f) => f.is_visible);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleHeaderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const allCols = orderedColumns.map((c) => c.column_name);
    const oldIndex = allCols.indexOf(active.id as string);
    const newIndex = allCols.indexOf(over.id as string);
    const reordered = arrayMove(allCols, oldIndex, newIndex);

    updateOrder.mutate(reordered.map((col, idx) => ({ column_name: col, sort_order: idx })));
  };

  const allSelected = customers.length > 0 && selectedIds.size === customers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length;

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomer.mutate(id);
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

  const getHeaderLabel = (col: string) => HEADER_LABELS[col] || COLUMN_LABELS[col] || col;
  const getHeaderClassName = (col: string) => {
    if (['has_trial', 'subscription_plan', 'reminders_enabled'].includes(col)) return 'text-center';
    return '';
  };

  const renderCell = (col: string, customer: Customer) => {
    switch (col) {
      case 'name':
        return (
          <TableCell key={col}>
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
        );
      case 'email':
        return null; // shown under name
      case 'phone':
        return <TableCell key={col} className="text-muted-foreground">{customer.phone || '-'}</TableCell>;
      case 'service':
        return (
          <TableCell key={col} onClick={(e) => e.stopPropagation()}>
            <Select
              value={customer.service || 'none'}
              onValueChange={(value) => updateCustomer.mutate({ id: customer.id, service: value === 'none' ? null : value })}
            >
              <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {serviceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
        );
      case 'has_trial':
        return (
          <TableCell key={col} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, has_trial: !customer.has_trial })}>
              {customer.has_trial ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TableCell>
        );
      case 'subscription_plan':
        return (
          <TableCell key={col} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, subscription_plan: customer.subscription_plan ? null : 'Active' })}>
              {customer.subscription_plan ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />}
            </Button>
          </TableCell>
        );
      case 'subscription_end_date':
        return (
          <TableCell key={col} className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                  {customer.subscription_end_date ? format(parseISO(customer.subscription_end_date), 'MM/dd/yyyy') : <span className="text-muted-foreground">-</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customer.subscription_end_date ? parseISO(customer.subscription_end_date) : undefined} onSelect={(date) => updateCustomer.mutate({ id: customer.id, subscription_end_date: date ? format(date, 'yyyy-MM-dd') : null })} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </TableCell>
        );
      case 'vod_plan':
        return (
          <TableCell key={col} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, vod_plan: customer.vod_plan ? null : 'Active' })}>
              {customer.vod_plan ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />}
            </Button>
          </TableCell>
        );
      case 'vod_end_date':
        return (
          <TableCell key={col} className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 font-normal">
                  {customer.vod_end_date ? format(parseISO(customer.vod_end_date), 'MM/dd/yyyy') : <span className="text-muted-foreground">-</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customer.vod_end_date ? parseISO(customer.vod_end_date) : undefined} onSelect={(date) => updateCustomer.mutate({ id: customer.id, vod_end_date: date ? format(date, 'yyyy-MM-dd') : null })} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </TableCell>
        );
      case 'company':
        return <TableCell key={col} className="text-muted-foreground">{customer.company || '-'}</TableCell>;
      case 'device':
        return (
          <TableCell key={col} onClick={(e) => e.stopPropagation()}>
            <Select value={customer.device || 'none'} onValueChange={(value) => updateCustomer.mutate({ id: customer.id, device: value === 'none' ? null : value })}>
              <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {deviceOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
        );
      case 'subscription_status':
        return <TableCell key={col}><StatusBadge status={customer.subscription_status as any || 'active'} /></TableCell>;
      case 'reminders_enabled':
        return (
          <TableCell key={col} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, reminders_enabled: !customer.reminders_enabled })}>
              {customer.reminders_enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TableCell>
        );
      case 'last_contact_date':
        return <TableCell key={col} className="text-muted-foreground">{customer.last_contact_date ? format(parseISO(customer.last_contact_date), 'MM/dd/yyyy') : '-'}</TableCell>;
      case 'total_spent':
        return <TableCell key={col} className="text-muted-foreground">{customer.total_spent != null ? `$${customer.total_spent}` : '-'}</TableCell>;
      default:
        return null;
    }
  };

  return (
    <>
      <SendEmailDialog 
        customer={emailCustomer} 
        open={!!emailCustomer} 
        onOpenChange={(open) => !open && setEmailCustomer(null)} 
      />
      
      <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deleteCustomer.isPending}>
            <Trash2 className="h-4 w-4 mr-2" />Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
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
                  ref={(ref) => { if (ref) { (ref as any).indeterminate = someSelected; } }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHeaderDragEnd}>
                <SortableContext items={visibleColumns.filter((c) => c !== 'email')} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.filter((c) => c !== 'email').map((col) => (
                    <SortableHeader key={col} id={col} className={getHeaderClassName(col)}>
                      {getHeaderLabel(col)}
                    </SortableHeader>
                  ))}
                </SortableContext>
              </DndContext>
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
                        if (next.has(customer.id)) next.delete(customer.id);
                        else next.add(customer.id);
                        return next;
                      });
                    }}
                    aria-label={`Select ${customer.name}`}
                  />
                </TableCell>
                {visibleColumns.filter((c) => c !== 'email').map((col) => renderCell(col, customer))}
                {visibleCustomFields.map((field) => (
                  <TableCell key={field.id}>
                    {(customer.custom_data as Record<string, unknown>)?.[field.name]?.toString() || '-'}
                  </TableCell>
                ))}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {customer.email && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEmailCustomer(customer)} title="Send email">
                        <Mail className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDelete(e, customer.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
    </>
  );
}
