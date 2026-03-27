import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AddonType {
  id: string;
  name: string;
  sort_order: number;
  user_id: string;
  created_at: string;
}

export function useAddonTypes() {
  return useQuery({
    queryKey: ['addon_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as AddonType[];
    },
  });
}

export function useAllAddonOptions() {
  const { data: addonTypes = [] } = useAddonTypes();
  return addonTypes.map(a => a.name);
}

export function useCreateAddonType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('addon_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = existing && existing.length > 0 ? (existing[0] as any).sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('addon_types')
        .insert({ name, sort_order: nextOrder, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon_types'] });
    },
  });
}

export function useDeleteAddonType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addon_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon_types'] });
    },
  });
}
