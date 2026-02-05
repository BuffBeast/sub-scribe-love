import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_COLORS = [
  { name: 'purple', label: 'Purple', hue: '262' },
  { name: 'blue', label: 'Blue', hue: '221' },
  { name: 'teal', label: 'Teal', hue: '180' },
  { name: 'green', label: 'Green', hue: '142' },
  { name: 'orange', label: 'Orange', hue: '24' },
  { name: 'pink', label: 'Pink', hue: '330' },
  { name: 'crimson', label: 'Crimson', hue: '0' },
] as const;

export type ThemeColor = typeof THEME_COLORS[number]['name'];

interface ColorThemePickerProps {
  value: ThemeColor;
  onChange: (color: ThemeColor) => void;
}

export function ColorThemePicker({ value, onChange }: ColorThemePickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {THEME_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          onClick={() => onChange(color.name)}
          className={cn(
            'relative h-10 w-10 rounded-full transition-all duration-200',
            'ring-2 ring-offset-2 ring-offset-background',
            value === color.name 
              ? 'ring-foreground scale-110' 
              : 'ring-transparent hover:ring-muted-foreground/50'
          )}
          style={{ 
            backgroundColor: `hsl(${color.hue}, 70%, 50%)`,
          }}
          title={color.label}
        >
          {value === color.name && (
            <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}

export function getThemeHue(colorName: string): string {
  const color = THEME_COLORS.find(c => c.name === colorName);
  return color?.hue || '262'; // Default to purple
}

export { THEME_COLORS };
