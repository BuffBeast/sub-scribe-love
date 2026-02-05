import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { CustomField } from '@/hooks/useCustomFields';

interface ExportCSVButtonProps {
  customers: Customer[];
  customFields: CustomField[];
}

export function ExportCSVButton({ customers, customFields }: ExportCSVButtonProps) {
  const handleExport = () => {
    if (customers.length === 0) return;

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Company',
      'Status',
      'Plan',
      'Total Spent',
      'Start Date',
      'End Date',
      'Last Contact',
      ...customFields.map((f) => f.name),
    ];

    const rows = customers.map((c) => {
      const customData = c.custom_data as Record<string, unknown> || {};
      return [
        c.name,
        c.email || '',
        c.phone || '',
        c.company || '',
        c.subscription_status || '',
        c.subscription_plan || '',
        c.total_spent?.toString() || '0',
        c.subscription_start_date || '',
        c.subscription_end_date || '',
        c.last_contact_date || '',
        ...customFields.map((f) => String(customData[f.name] || '')),
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
    <Button variant="outline" onClick={handleExport} disabled={customers.length === 0}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
