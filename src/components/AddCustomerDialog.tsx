import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useToast } from '@/hooks/use-toast';

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const { data: customFields = [] } = useCustomFields();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subscription_status: 'active',
    subscription_plan: '',
    subscription_start_date: '',
    subscription_end_date: '',
    vod_plan: '',
    vod_start_date: '',
    vod_end_date: '',
  });
  const [customData, setCustomData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    createCustomer.mutate(
      {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        subscription_status: form.subscription_status,
        subscription_plan: form.subscription_plan || null,
        subscription_start_date: form.subscription_start_date || null,
        subscription_end_date: form.subscription_end_date || null,
        vod_plan: form.vod_plan || null,
        vod_start_date: form.vod_start_date || null,
        vod_end_date: form.vod_end_date || null,
        custom_data: customData,
      } as any,
      {
        onSuccess: () => {
          toast({ title: 'Customer added' });
          setOpen(false);
          setForm({
            name: '',
            email: '',
            phone: '',
            company: '',
            subscription_status: 'active',
            subscription_plan: '',
            subscription_start_date: '',
            subscription_end_date: '',
            vod_plan: '',
            vod_start_date: '',
            vod_end_date: '',
          });
          setCustomData({});
        },
        onError: (error) => {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">LIVE Subscription</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="live_plan">LIVE Plan</Label>
                <Input
                  id="live_plan"
                  value={form.subscription_plan}
                  onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}
                  placeholder="e.g., Professional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="live_start_date">Start Date</Label>
                <Input
                  id="live_start_date"
                  type="date"
                  value={form.subscription_start_date}
                  onChange={(e) => setForm({ ...form, subscription_start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="live_end_date">Expiry Date</Label>
                <Input
                  id="live_end_date"
                  type="date"
                  value={form.subscription_end_date}
                  onChange={(e) => setForm({ ...form, subscription_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">VOD Subscription</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vod_plan">VOD Plan</Label>
                <Input
                  id="vod_plan"
                  value={form.vod_plan}
                  onChange={(e) => setForm({ ...form, vod_plan: e.target.value })}
                  placeholder="e.g., Premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vod_start_date">Start Date</Label>
                <Input
                  id="vod_start_date"
                  type="date"
                  value={form.vod_start_date}
                  onChange={(e) => setForm({ ...form, vod_start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vod_end_date">Expiry Date</Label>
                <Input
                  id="vod_end_date"
                  type="date"
                  value={form.vod_end_date}
                  onChange={(e) => setForm({ ...form, vod_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.name}</Label>
              <Input
                id={field.id}
                type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                value={customData[field.name] || ''}
                onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
              />
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={createCustomer.isPending}>
            {createCustomer.isPending ? 'Adding...' : 'Add Customer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
