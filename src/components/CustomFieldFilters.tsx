import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomField } from '@/hooks/useCustomFields';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomFieldFiltersProps {
  customFields: CustomField[];
  filters: Record<string, string>;
  onChange: (fieldName: string, value: string) => void;
  onClear: (fieldName: string) => void;
}

export function CustomFieldFilters({ customFields, filters, onChange, onClear }: CustomFieldFiltersProps) {
  // Only show dropdown (select) fields that are visible
  const filterableFields = customFields.filter(
    (field) => field.field_type === 'select' && field.is_visible && field.options && field.options.length > 0
  );

  if (filterableFields.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterableFields.map((field) => {
        const currentValue = filters[field.name] || '';
        const options = (field.options as string[]) || [];

        return (
          <div key={field.id} className="flex items-center gap-1">
            <Select
              value={currentValue}
              onValueChange={(value) => onChange(field.name, value)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                <SelectValue placeholder={field.name} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="__all__">All {field.name}</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentValue && currentValue !== '__all__' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onClear(field.name)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
