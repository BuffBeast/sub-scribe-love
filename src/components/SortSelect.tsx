import { ArrowDownAZ, ArrowUpAZ, CalendarClock, Tv } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'expiry-asc' | 'expiry-desc' | 'alpha-asc' | 'alpha-desc' | 'service-asc' | 'service-desc';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'expiry-asc', label: 'Expiry (Soonest)', icon: <CalendarClock className="h-4 w-4" /> },
  { value: 'expiry-desc', label: 'Expiry (Latest)', icon: <CalendarClock className="h-4 w-4" /> },
  { value: 'alpha-asc', label: 'Name (A-Z)', icon: <ArrowDownAZ className="h-4 w-4" /> },
  { value: 'alpha-desc', label: 'Name (Z-A)', icon: <ArrowUpAZ className="h-4 w-4" /> },
  { value: 'service-asc', label: 'Service (A-Z)', icon: <Tv className="h-4 w-4" /> },
  { value: 'service-desc', label: 'Service (Z-A)', icon: <Tv className="h-4 w-4" /> },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  const selectedOption = sortOptions.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={(val) => onChange(val as SortOption)}>
      <SelectTrigger className="w-[180px] h-10">
        <div className="flex items-center gap-2">
          {selectedOption?.icon}
          <SelectValue placeholder="Sort by..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
