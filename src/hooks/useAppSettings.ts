import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppSettings {
  id: string;
  app_name: string;
  logo_url: string | null;
  tagline: string | null;
  reminder_subject: string | null;
  reminder_message: string | null;
  theme_color: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // First try to get user-specific settings
      let { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no user-specific settings, check for legacy settings with null user_id
      if (!data) {
        const { data: legacyData, error: legacyError } = await supabase
          .from('app_settings')
          .select('*')
          .is('user_id', null)
          .maybeSingle();
        
        if (legacyError) throw legacyError;
        data = legacyData;
      }

      return data as AppSettings | null;
    },
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      appName, 
      logoUrl,
      tagline,
      reminderSubject,
      reminderMessage,
      themeColor,
    }: { 
      appName: string; 
      logoUrl?: string | null;
      tagline?: string;
      reminderSubject?: string;
      reminderMessage?: string;
      themeColor?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First check for user-specific settings
      let { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // If no user-specific settings, check for legacy settings with null user_id
      if (!existing) {
        const { data: legacyData } = await supabase
          .from('app_settings')
          .select('id')
          .is('user_id', null)
          .maybeSingle();
        existing = legacyData;
      }

      const updates: Record<string, unknown> = { 
        app_name: appName, 
        logo_url: logoUrl,
        user_id: user.id, // Always ensure user_id is set
      };
      if (tagline !== undefined) updates.tagline = tagline;
      if (reminderSubject !== undefined) updates.reminder_subject = reminderSubject;
      if (reminderMessage !== undefined) updates.reminder_message = reminderMessage;
      if (themeColor !== undefined) updates.theme_color = themeColor;

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ ...updates, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}

export function useUploadLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      toast.error('Failed to upload logo: ' + error.message);
    },
  });
}
