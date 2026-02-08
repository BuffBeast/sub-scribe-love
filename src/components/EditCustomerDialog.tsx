import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Customer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useAllDeviceOptions } from '@/hooks/useDeviceTypes';
import { useAllServiceOptions } from '@/hooks/useServiceTypes';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const { data: customFields = [] } = useCustomFields();
  const deviceOptions = useAllDeviceOptions();
  const serviceOptions = useAllServiceOptions();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subscription_status: 'active',
    service: '',
    has_trial: false,
    has_live: false,
    subscription_end_date: null as Date | null,
    has_vod: false,
    vod_end_date: null as Date | null,
    device: '',
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
        service: customer.service || '',
        has_trial: customer.has_trial || false,
        has_live: !!customer.subscription_plan,
        subscription_end_date: customer.subscription_end_date ? new Date(customer.subscription_end_date) : null,
        has_vod: !!customer.vod_plan,
        vod_end_date: customer.vod_end_date ? new Date(customer.vod_end_date) : null,
        device: customer.device || '',
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
        service: form.service || null,
        has_trial: form.has_trial,
        subscription_plan: form.has_live ? 'Active' : null,
        subscription_end_date: form.subscription_end_date ? format(form.subscription_end_date, 'yyyy-MM-dd') : null,
        vod_plan: form.has_vod ? 'Active' : null,
        vod_end_date: form.vod_end_date ? format(form.vod_end_date, 'yyyy-MM-dd') : null,
        device: form.device || null,
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
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Customer Name *</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label htmlFor="edit-service">Service</Label>
            <Select value={form.service || 'none'} onValueChange={(v) => setForm({ ...form, service: v === 'none' ? '' : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select service..." />
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

          {/* Trial */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-trial"
              checked={form.has_trial}
              onCheckedChange={(checked) => setForm({ ...form, has_trial: !!checked })}
            />
            <Label htmlFor="edit-trial" className="font-normal">Trial Customer</Label>
          </div>

          {/* LIVE Subscription */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-live"
                checked={form.has_live}
                onCheckedChange={(checked) => setForm({ ...form, has_live: !!checked })}
              />
              <Label htmlFor="edit-live" className="font-medium">LIVE Subscription</Label>
            </div>
            {form.has_live && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm text-muted-foreground">Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.subscription_end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.subscription_end_date ? format(form.subscription_end_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.subscription_end_date || undefined}
                      onSelect={(date) => setForm({ ...form, subscription_end_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* VOD Subscription */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-vod"
                checked={form.has_vod}
                onCheckedChange={(checked) => setForm({ ...form, has_vod: !!checked })}
              />
              <Label htmlFor="edit-vod" className="font-medium">VOD Subscription</Label>
            </div>
            {form.has_vod && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm text-muted-foreground">Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.vod_end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.vod_end_date ? format(form.vod_end_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.vod_end_date || undefined}
                      onSelect={(date) => setForm({ ...form, vod_end_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Device */}
          <div className="space-y-2">
            <Label htmlFor="edit-device">Device</Label>
            <Select value={form.device || 'none'} onValueChange={(v) => setForm({ ...form, device: v === 'none' ? '' : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select device..." />
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-company">Notes</Label>
            <Input
              id="edit-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Add notes..."
            />
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
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

          {/* Status */}
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

          {/* Custom Fields */}
          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`edit-${field.id}`}>{field.name}</Label>
              {field.field_type === 'select' && field.options ? (
                <Select 
                  value={customData[field.name] || 'none'} 
                  onValueChange={(v) => setCustomData({ ...customData, [field.name]: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`edit-${field.id}`}
                  type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                  value={customData[field.name] || ''}
                  onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                />
              )}
            </div>
          ))}

          {/* Contact Info Section */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Contact Info (Optional)</p>
            <div className="space-y-3">
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
