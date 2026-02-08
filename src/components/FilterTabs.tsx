import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface CustomFieldFilter {
  fieldName: string;
  options: string[];
  counts: Record<string, number>;
}

interface FilterTabsProps {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
  customFieldFilters?: CustomFieldFilter[];
}

export function FilterTabs({ value, onChange, counts, customFieldFilters = [] }: FilterTabsProps) {
  // Parse the current value to check if it's a custom field filter
  const isCustomFieldFilter = value.startsWith('custom:');
  const statusValue = isCustomFieldFilter ? 'all' : value;

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <Tabs value={value} onValueChange={handleChange} className="w-full">
      <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto flex-nowrap gap-1">
        {/* Built-in status tabs */}
        <TabsTrigger value="all" className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm">
          All <span className="ml-1 text-muted-foreground">({counts.all})</span>
        </TabsTrigger>
        <TabsTrigger value="active" className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm">
          Active <span className="ml-1 text-muted-foreground">({counts.active})</span>
        </TabsTrigger>
        <TabsTrigger value="trial" className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm">
          Trial <span className="ml-1 text-muted-foreground">({counts.trial})</span>
        </TabsTrigger>
        <TabsTrigger value="expired" className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm">
          Expired <span className="ml-1 text-muted-foreground">({counts.expired})</span>
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm">
          Cancelled <span className="ml-1 text-muted-foreground">({counts.cancelled})</span>
        </TabsTrigger>

        {/* Custom field dropdown tabs */}
        {customFieldFilters.map((fieldFilter) => (
          fieldFilter.options.length > 0 && (
            <div key={fieldFilter.fieldName} className="flex items-center gap-1">
              <Separator orientation="vertical" className="h-6 mx-1" />
              <span className="text-xs text-muted-foreground px-1 shrink-0">{fieldFilter.fieldName}:</span>
              {fieldFilter.options.map((option) => (
                <TabsTrigger 
                  key={`custom:${fieldFilter.fieldName}:${option}`} 
                  value={`custom:${fieldFilter.fieldName}:${option}`}
                  className="data-[state=active]:bg-background shrink-0 text-xs sm:text-sm"
                >
                  {option} <span className="ml-1 text-muted-foreground">({fieldFilter.counts[option] || 0})</span>
                </TabsTrigger>
              ))}
            </div>
          )
        ))}
      </TabsList>
    </Tabs>
  );
}
