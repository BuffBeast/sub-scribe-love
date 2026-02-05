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
      const { data, error } = await supabase
        .from('column_visibility')
        .select('*');
      if (error) throw error;
      return data as ColumnVisibility[];
    },
  });
}

export function useUpdateColumnVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ column_name, is_visible }: { column_name: string; is_visible: boolean }) => {
      const { data, error } = await supabase
        .from('column_visibility')
        .update({ is_visible })
        .eq('column_name', column_name)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column_visibility'] });
    },
  });
}
