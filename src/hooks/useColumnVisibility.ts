import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ColumnVisibility {
  id: string;
  column_name: string;
  is_visible: boolean;
}

export function useColumnVisibility() {
  return useQuery({
    queryKey: ['column_visibility'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as ColumnVisibility[];
      const { data, error } = await supabase
        .from('column_visibility')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as ColumnVisibility[];
    },
  });
}

export function useUpdateColumnVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ column_name, is_visible }: { column_name: string; is_visible: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Try to update existing record first
      const { data: existing } = await supabase
        .from('column_visibility')
        .select('id')
        .eq('column_name', column_name)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('column_visibility')
          .update({ is_visible })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('column_visibility')
          .insert({ column_name, is_visible, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column_visibility'] });
    },
  });
}
