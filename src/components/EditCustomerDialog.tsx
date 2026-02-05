import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Customer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useToast } from '@/hooks/use-toast';

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const { data: customFields = [] } = useCustomFields();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subscription_status: 'active',
    subscription_plan: '',
    total_spent: '',
    reminders_enabled: true,
  });
  const [customData, setCustomData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        subscription_status: customer.subscription_status || 'active',
        subscription_plan: customer.subscription_plan || '',
        total_spent: customer.total_spent?.toString() || '',
        reminders_enabled: customer.reminders_enabled ?? true,
      });
      const cd = customer.custom_data as Record<string, unknown> || {};
      const mapped: Record<string, string> = {};
      for (const key of Object.keys(cd)) {
        mapped[key] = String(cd[key] || '');
      }
      setCustomData(mapped);
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer) return;
    
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    updateCustomer.mutate(
      {
        id: customer.id,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        subscription_status: form.subscription_status,
        subscription_plan: form.subscription_plan || null,
        total_spent: form.total_spent ? parseFloat(form.total_spent) : 0,
        reminders_enabled: form.reminders_enabled,
        custom_data: customData,
      },
      {
        onSuccess: () => {
          toast({ title: 'Customer updated' });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company">Notes</Label>
            <Input
              id="edit-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Add notes..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={form.subscription_status} onValueChange={(v) => setForm({ ...form, subscription_status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-plan">Plan</Label>
            <Input
              id="edit-plan"
              value={form.subscription_plan}
              onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}
              placeholder="e.g., Professional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-spent">Total Spent</Label>
            <Input
              id="edit-spent"
              type="number"
              value={form.total_spent}
              onChange={(e) => setForm({ ...form, total_spent: e.target.value })}
              placeholder="0"
            />
          </div>

          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`edit-${field.id}`}>{field.name}</Label>
              <Input
                id={`edit-${field.id}`}
                type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                value={customData[field.name] || ''}
                onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
              />
            </div>
          ))}

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-reminders" className="font-medium">Email Reminders</Label>
                <p className="text-sm text-muted-foreground">Send automatic expiry reminders</p>
              </div>
              <Switch
                id="edit-reminders"
                checked={form.reminders_enabled}
                onCheckedChange={(checked) => setForm({ ...form, reminders_enabled: checked })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={updateCustomer.isPending}>
            {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
