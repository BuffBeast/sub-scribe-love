import { useState, ReactNode } from 'react';
import { format } from 'date-fns';

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
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
import { Trash2, Check, X, Bell, BellOff, Mail, GripVertical, AlertTriangle } from 'lucide-react';
import { isExpiringSoon } from '@/lib/dateUtils';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

import { useOrderedColumns, useUpdateColumnOrder, COLUMN_LABELS, UnifiedColumn } from '@/hooks/useColumnVisibility';
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
// CSS transform removed - table cells don't support transform-based drag

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

const HEADER_LABELS: Record<string, string> = {
  name: 'Customer',
  subscription_plan: 'LIVE',
  subscription_end_date: 'Expiry',
  has_live_trial: 'L Trial',
  has_vod_trial: 'V Trial',
  vod_end_date: 'Expiry',
  company: 'Notes',
  subscription_status: 'Status',
};

function SortableHeader({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, isDragging, isSorting, over } = useSortable({ id });

  return (
    <TableHead
      ref={setNodeRef}
      className={cn(
        "font-semibold transition-colors",
        isDragging && "bg-primary/15 opacity-70",
        !isDragging && isSorting && over?.id === id && "bg-accent",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0">
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
  const deviceOptions = useAllDeviceOptions();
  const serviceOptions = useAllServiceOptions();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null);

  // Filter to visible columns, skip email (shown under name)
  const visibleColumns = orderedColumns.filter((c) => c.is_visible && c.column_name !== 'email');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  const handleHeaderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Work with ALL columns (including hidden) to preserve their positions
    const allIds = orderedColumns.map((c) => c.id);
    const oldIndex = allIds.indexOf(active.id as string);
    const newIndex = allIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(orderedColumns, oldIndex, newIndex);

    updateOrder.mutate(reordered.map((col, idx) => ({ column_name: col.column_name, sort_order: idx })));
  };

  const allSelected = customers.length > 0 && selectedIds.size === customers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length;

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomer.mutate(id);
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(customers.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: `Deleted ${count} customer${count > 1 ? 's' : ''}` });
    } catch (e) {
      console.error('Failed to delete customers:', e);
      toast({ title: 'Failed to delete some customers', variant: 'destructive' });
    }
    setSelectedIds(new Set());
  };

  const getHeaderLabel = (col: UnifiedColumn) => {
    if (col.type === 'custom') return col.label;
    return HEADER_LABELS[col.column_name] || COLUMN_LABELS[col.column_name] || col.column_name;
  };

  const getHeaderClassName = (col: UnifiedColumn) => {
    if (['has_live_trial', 'has_vod_trial', 'subscription_plan', 'reminders_enabled'].includes(col.column_name)) return 'text-center';
    return '';
  };

  const renderCell = (col: UnifiedColumn, customer: Customer) => {
    if (col.type === 'custom' && col.customField) {
      return (
        <TableCell key={col.id}>
          {(customer.custom_data as Record<string, unknown>)?.[col.customField.name]?.toString() || '-'}
        </TableCell>
      );
    }

    switch (col.column_name) {
      case 'name':
        return (
          <TableCell key={col.id}>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">{getInitials(customer.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{customer.name}</p>
                {orderedColumns.find((c) => c.column_name === 'email')?.is_visible && customer.email && (
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                )}
              </div>
            </div>
          </TableCell>
        );
      case 'phone':
        return <TableCell key={col.id} className="text-muted-foreground">{customer.phone || '-'}</TableCell>;
      case 'service':
        return (
          <TableCell key={col.id} onClick={(e) => e.stopPropagation()}>
            <Select value={customer.service || 'none'} onValueChange={(value) => updateCustomer.mutate({ id: customer.id, service: value === 'none' ? null : value })}>
              <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {serviceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
        );
      case 'has_live_trial':
        return (
          <TableCell key={col.id} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, has_live_trial: !customer.has_live_trial })}>
              {customer.has_live_trial ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TableCell>
        );
      case 'has_vod_trial':
        return (
          <TableCell key={col.id} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, has_vod_trial: !customer.has_vod_trial })}>
              {customer.has_vod_trial ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TableCell>
        );
      case 'subscription_plan':
        return (
          <TableCell key={col.id} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, subscription_plan: customer.subscription_plan ? null : 'Active' })}>
              {customer.subscription_plan ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />}
            </Button>
          </TableCell>
        );
      case 'subscription_end_date': {
        const liveExpiring = isExpiringSoon(customer.subscription_end_date);
        return (
          <TableCell key={col.id} className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("h-8 px-2 font-normal", liveExpiring && "text-amber-600")}>
                  {liveExpiring && <AlertTriangle className="h-3.5 w-3.5 mr-1 shrink-0" />}
                  {customer.subscription_end_date ? format(parseDateLocal(customer.subscription_end_date), 'MM/dd/yyyy') : <span className="text-muted-foreground">-</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customer.subscription_end_date ? parseDateLocal(customer.subscription_end_date) : undefined} onSelect={(date) => updateCustomer.mutate({ id: customer.id, subscription_end_date: date ? formatDateLocal(date) : null })} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </TableCell>
        );
      }
      case 'vod_plan':
        return (
          <TableCell key={col.id} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, vod_plan: customer.vod_plan ? null : 'Active' })}>
              {customer.vod_plan ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />}
            </Button>
          </TableCell>
        );
      case 'vod_end_date': {
        const vodExpiring = isExpiringSoon(customer.vod_end_date);
        return (
          <TableCell key={col.id} className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("h-8 px-2 font-normal", vodExpiring && "text-amber-600")}>
                  {vodExpiring && <AlertTriangle className="h-3.5 w-3.5 mr-1 shrink-0" />}
                  {customer.vod_end_date ? format(parseDateLocal(customer.vod_end_date), 'MM/dd/yyyy') : <span className="text-muted-foreground">-</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customer.vod_end_date ? parseDateLocal(customer.vod_end_date) : undefined} onSelect={(date) => updateCustomer.mutate({ id: customer.id, vod_end_date: date ? formatDateLocal(date) : null })} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </TableCell>
        );
      }
      case 'company':
        return <TableCell key={col.id} className="text-muted-foreground">{customer.company || '-'}</TableCell>;
      case 'device':
        return (
          <TableCell key={col.id} onClick={(e) => e.stopPropagation()}>
            <Select value={customer.device || 'none'} onValueChange={(value) => updateCustomer.mutate({ id: customer.id, device: value === 'none' ? null : value })}>
              <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {deviceOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
        );
      case 'subscription_status': {
        const effectiveStatus = customer.subscription_status === 'active' && (isExpiringSoon(customer.subscription_end_date) || isExpiringSoon(customer.vod_end_date)) ? 'expiring' : (customer.subscription_status || 'active');
        return <TableCell key={col.id}><StatusBadge status={effectiveStatus as any} /></TableCell>;
      }
      case 'reminders_enabled':
        return (
          <TableCell key={col.id} className="text-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCustomer.mutate({ id: customer.id, reminders_enabled: !customer.reminders_enabled })}>
              {customer.reminders_enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TableCell>
        );
      case 'last_contact_date':
        return <TableCell key={col.id} className="text-muted-foreground">{customer.last_contact_date ? format(parseDateLocal(customer.last_contact_date), 'MM/dd/yyyy') : '-'}</TableCell>;
      case 'total_spent':
        return <TableCell key={col.id} className="text-muted-foreground">{customer.total_spent != null ? `$${customer.total_spent}` : '-'}</TableCell>;
      default:
        return null;
    }
  };

  return (
    <>
      <SendEmailDialog customer={emailCustomer} open={!!emailCustomer} onOpenChange={(open) => !open && setEmailCustomer(null)} />
      
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

      <Card className="shadow-card border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(ref) => { if (ref) { (ref as any).indeterminate = someSelected; } }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHeaderDragEnd}>
                <SortableContext items={visibleColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map((col) => (
                    <SortableHeader key={col.id} id={col.id} className={getHeaderClassName(col)}>
                      {getHeaderLabel(col)}
                    </SortableHeader>
                  ))}
                </SortableContext>
              </DndContext>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer, rowIndex) => (
              <motion.tr
                key={customer.id}
                initial={rowIndex < 20 ? { opacity: 0, y: 6 } : false}
                animate={rowIndex < 20 ? { opacity: 1, y: 0 } : undefined}
                transition={rowIndex < 20 ? { duration: 0.3, ease: 'easeOut', delay: rowIndex * 0.03 } : undefined}
                className="cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/30"
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
                {visibleColumns.map((col) => renderCell(col, customer))}
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
              </motion.tr>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
    </>
  );
}
