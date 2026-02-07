import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const TEMPLATE_HEADERS = [
  'Name',
  'Email',
  'Phone',
  'Service',
  'Trial',
  'LIVE Plan',
  'LIVE Expiry',
  'VOD Plan',
  'VOD Expiry',
  'Device',
  'Notes',
  'Status',
  'Price',
];

const SAMPLE_ROW = [
  'John Doe',
  'john@example.com',
  '+1234567890',
  'Spectra',
  'No',
  'Premium',
  '2025-12-31',
  'Basic',
  '2025-06-30',
  'Firestick',
  'VIP customer',
  'active',
  '99.99',
];

export function DownloadTemplateButton() {
  const handleDownload = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      SAMPLE_ROW.map(cell => 
        cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customer-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-2 text-muted-foreground">
      <FileDown className="h-4 w-4" />
      Download Template
    </Button>
  );
}
