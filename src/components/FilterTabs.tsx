import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionStatus } from '@/types/customer';

interface FilterTabsProps {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}

export function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="bg-muted/50">
        <TabsTrigger value="all" className="data-[state=active]:bg-background">
          All <span className="ml-1.5 text-muted-foreground">({counts.all})</span>
        </TabsTrigger>
        <TabsTrigger value="active" className="data-[state=active]:bg-background">
          Active <span className="ml-1.5 text-muted-foreground">({counts.active})</span>
        </TabsTrigger>
        <TabsTrigger value="trial" className="data-[state=active]:bg-background">
          Trial <span className="ml-1.5 text-muted-foreground">({counts.trial})</span>
        </TabsTrigger>
        <TabsTrigger value="expired" className="data-[state=active]:bg-background">
          Expired <span className="ml-1.5 text-muted-foreground">({counts.expired})</span>
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="data-[state=active]:bg-background">
          Cancelled <span className="ml-1.5 text-muted-foreground">({counts.cancelled})</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
