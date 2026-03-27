import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Customer } from '@/hooks/useCustomers';
import { CustomField } from '@/hooks/useCustomFields';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';

interface ExportCSVButtonProps {
  customers: Customer[];
  customFields: CustomField[];
}

// Maps column visibility keys to CSV header names and customer data extractors
const COLUMN_CSV_MAP: Record<string, { header: string; getValue: (c: Customer, customData: Record<string, unknown>) => string }> = {
  name: { header: 'Name', getValue: (c) => c.name },
  email: { header: 'Email', getValue: (c) => c.email || '' },
  phone: { header: 'Phone', getValue: (c) => c.phone || '' },
  service: { header: 'Service', getValue: (c) => c.service || '' },
  has_live_trial: { header: 'LIVE Trial', getValue: (c) => c.has_live_trial ? 'Yes' : 'No' },
  has_vod_trial: { header: 'VOD Trial', getValue: (c) => c.has_vod_trial ? 'Yes' : 'No' },
  subscription_plan: { header: 'LIVE Plan', getValue: (c) => c.subscription_plan || '' },
  subscription_end_date: { header: 'LIVE Expiry', getValue: (c) => c.subscription_end_date || '' },
  vod_plan: { header: 'VOD Plan', getValue: (c) => c.vod_plan || '' },
  vod_end_date: { header: 'VOD Expiry', getValue: (c) => c.vod_end_date || '' },
  device: { header: 'Device', getValue: (c) => c.device || '' },
  company: { header: 'Notes', getValue: (c) => c.company || '' },
  subscription_status: { header: 'Status', getValue: (c) => c.subscription_status || '' },
  total_spent: { header: 'Price', getValue: (c) => c.total_spent?.toString() || '0' },
  reminders_enabled: { header: 'Reminders', getValue: (c) => c.reminders_enabled ? 'Yes' : 'No' },
  connections: { header: 'Connections', getValue: (c) => (c.connections ?? 1).toString() },
  selected_addons: { header: 'Add-Ons', getValue: (c) => { const a = Array.isArray(c.selected_addons) ? (c.selected_addons as string[]) : []; return a.join(', '); } },
};

const ALL_COLUMN_ORDER = [
  'name', 'email', 'phone', 'service',
  'subscription_plan', 'has_live_trial', 'subscription_end_date',
  'vod_plan', 'has_vod_trial', 'vod_end_date',
  'device', 'company', 'subscription_status', 'total_spent', 'reminders_enabled',
];

export function ExportCSVButton({ customers, customFields }: ExportCSVButtonProps) {
  const [exportOnlyVisible, setExportOnlyVisible] = useState(false);
  const { data: columns = [] } = useColumnVisibility();

  // Columns without a record default to visible
  const hiddenColumnNames = columns
    .filter((c) => !c.is_visible)
    .map((c) => c.column_name);
  const visibleColumnNames = ALL_COLUMN_ORDER.filter(
    (col) => !hiddenColumnNames.includes(col)
  );

  const visibleCustomFields = customFields.filter((f) => f.is_visible);

  const handleExport = () => {
    if (customers.length === 0) return;

    const columnsToExport = exportOnlyVisible
      ? ALL_COLUMN_ORDER.filter((col) => visibleColumnNames.includes(col))
      : ALL_COLUMN_ORDER;

    const customFieldsToExport = exportOnlyVisible ? visibleCustomFields : customFields;

    const headers = [
      ...columnsToExport.map((col) => COLUMN_CSV_MAP[col]?.header || col),
      ...customFieldsToExport.map((f) => f.name),
    ];

    const rows = customers.map((c) => {
      const customData = c.custom_data as Record<string, unknown> || {};
      return [
        ...columnsToExport.map((col) => COLUMN_CSV_MAP[col]?.getValue(c, customData) || ''),
        ...customFieldsToExport.map((f) => String(customData[f.name] || '')),
      ];
    });

    const escapeCell = (cell: string) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={customers.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="export-visible" className="text-sm">Only visible columns</Label>
            <Switch
              id="export-visible"
              checked={exportOnlyVisible}
              onCheckedChange={setExportOnlyVisible}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {exportOnlyVisible
              ? 'Export will match your dashboard view'
              : 'All columns will be included'}
          </p>
          {exportOnlyVisible && (
            <p className="text-xs text-destructive font-medium">
              ⚠️ Hidden column data will not be included in this export.
            </p>
          )}
          <Button onClick={handleExport} className="w-full" disabled={customers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
