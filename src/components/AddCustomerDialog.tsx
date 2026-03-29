import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { calculateCredits } from '@/lib/creditCalculator';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useAllDeviceOptions } from '@/hooks/useDeviceTypes';
import { useAllServiceOptions } from '@/hooks/useServiceTypes';
import { useAllAddonOptions } from '@/hooks/useAddonTypes';
import { useToast } from '@/hooks/use-toast';

interface AddCustomerDialogProps {
  onOpenChange?: (open: boolean) => void;
}

export function AddCustomerDialog({ onOpenChange }: AddCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const { data: customFields = [] } = useCustomFields();
  const deviceOptions = useAllDeviceOptions();
  const serviceOptions = useAllServiceOptions();
  const addonOptions = useAllAddonOptions();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subscription_status: 'active',
    has_live: false,
    subscription_end_date: '',
    has_vod: false,
    vod_end_date: '',
    reminders_enabled: true,
    selected_devices: [] as string[],
    service: '',
    has_trial: false,
    has_live_trial: false,
    has_vod_trial: false,
    connections: 1,
    add_ons: 0,
    selected_addons: [] as string[],
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
        subscription_plan: form.has_live ? 'Active' : null,
        subscription_end_date: form.has_live ? form.subscription_end_date || null : null,
        vod_plan: form.has_vod ? 'Active' : null,
        vod_end_date: form.has_vod ? form.vod_end_date || null : null,
        reminders_enabled: form.reminders_enabled,
        device: form.device || null,
        service: form.service || null,
        has_trial: form.has_trial,
        has_live_trial: form.has_live_trial,
        has_vod_trial: form.has_vod_trial,
        connections: form.connections,
        add_ons: form.selected_addons.length,
        selected_addons: form.selected_addons,
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
            has_live: false,
            subscription_end_date: '',
            has_vod: false,
            vod_end_date: '',
            reminders_enabled: true,
            device: '',
            service: '',
            has_trial: false,
            has_live_trial: false,
            has_vod_trial: false,
            connections: 1,
            add_ons: 0,
            selected_addons: [],
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Customer</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
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

          {/* LIVE Subscription */}
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_live"
                  checked={form.has_live}
                  onCheckedChange={(checked) => setForm({ ...form, has_live: checked as boolean })}
                />
                <Label htmlFor="has_live" className="font-medium">LIVE</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_live_trial"
                  checked={form.has_live_trial}
                  onCheckedChange={(checked) => setForm({ ...form, has_live_trial: checked as boolean })}
                />
                <Label htmlFor="has_live_trial" className="text-sm text-muted-foreground">Trial</Label>
              </div>
            </div>
            {form.has_live && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="live_end_date">Expiry Date</Label>
                <Input
                  id="live_end_date"
                  type="date"
                  value={form.subscription_end_date}
                  onChange={(e) => setForm({ ...form, subscription_end_date: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* VOD Subscription */}
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_vod"
                  checked={form.has_vod}
                  onCheckedChange={(checked) => setForm({ ...form, has_vod: checked as boolean })}
                />
                <Label htmlFor="has_vod" className="font-medium">VOD</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_vod_trial"
                  checked={form.has_vod_trial}
                  onCheckedChange={(checked) => setForm({ ...form, has_vod_trial: checked as boolean })}
                />
                <Label htmlFor="has_vod_trial" className="text-sm text-muted-foreground">Trial</Label>
              </div>
            </div>
            {form.has_vod && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="vod_end_date">Expiry Date</Label>
                <Input
                  id="vod_end_date"
                  type="date"
                  value={form.vod_end_date}
                  onChange={(e) => setForm({ ...form, vod_end_date: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Connections & Add-Ons */}
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">Package Details</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Connections</Label>
                <Select value={String(form.connections)} onValueChange={(v) => setForm({ ...form, connections: parseInt(v) })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-center px-2">
                <Label className="text-xs text-muted-foreground">Credits</Label>
                <p className="text-lg font-bold text-primary tabular-nums">{calculateCredits(form.connections, form.selected_addons.length)}</p>
              </div>
            </div>
            {addonOptions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add-Ons</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {addonOptions.map((addon) => (
                    <div key={addon} className="flex items-center space-x-2">
                      <Checkbox
                        id={`addon-${addon}`}
                        checked={form.selected_addons.includes(addon)}
                        onCheckedChange={(checked) => {
                          const newAddons = checked
                            ? [...form.selected_addons, addon]
                            : form.selected_addons.filter(a => a !== addon);
                          setForm({ ...form, selected_addons: newAddons });
                        }}
                      />
                      <Label htmlFor={`addon-${addon}`} className="text-sm">{addon}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Device */}
          <div className="space-y-2">
            <Label htmlFor="device">Device</Label>
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
            <Label htmlFor="company">Notes</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Add notes..."
            />
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div className="space-y-0.5">
              <Label htmlFor="reminders_enabled" className="font-medium">Reminders</Label>
              <p className="text-sm text-muted-foreground">Send automatic expiry reminders</p>
            </div>
            <Switch
              id="reminders_enabled"
              checked={form.reminders_enabled}
              onCheckedChange={(checked) => setForm({ ...form, reminders_enabled: checked })}
            />
          </div>

          {/* Status */}
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

          {/* Email & Phone (collapsed section) */}
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Contact Info (Optional)</p>
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
          </div>

          {/* Custom Fields */}
          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.name}</Label>
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
                  id={field.id}
                  type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                  value={customData[field.name] || ''}
                  onChange={(e) => setCustomData({ ...customData, [field.name]: e.target.value })}
                />
              )}
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
