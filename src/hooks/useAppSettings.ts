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
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
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
    }: { 
      appName: string; 
      logoUrl?: string | null;
      tagline?: string;
      reminderSubject?: string;
      reminderMessage?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updates: Record<string, unknown> = { app_name: appName, logo_url: logoUrl };
      if (tagline !== undefined) updates.tagline = tagline;
      if (reminderSubject !== undefined) updates.reminder_subject = reminderSubject;
      if (reminderMessage !== undefined) updates.reminder_message = reminderMessage;

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
