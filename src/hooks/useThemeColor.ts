import { useEffect } from 'react';
import { useAppSettings } from './useAppSettings';
import { getThemeHue } from '@/components/ColorThemePicker';

export function useThemeColor() {
  const { data: settings } = useAppSettings();
  
  useEffect(() => {
    const themeColor = settings?.theme_color || 'purple';
    const hue = getThemeHue(themeColor);
    
    // Update CSS custom properties for the theme
    const root = document.documentElement;
    
    // Update primary color (keeping saturation and lightness similar to original)
    root.style.setProperty('--primary', `${hue} 70% 55%`);
    root.style.setProperty('--ring', `${hue} 70% 55%`);
    
    // Update accent to match
    root.style.setProperty('--accent', `${hue} 50% 95%`);
    
    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent');
    };
  }, [settings?.theme_color]);
  
  return settings?.theme_color || 'purple';
}
