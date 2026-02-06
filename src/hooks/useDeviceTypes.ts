import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeviceType {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

// Default device types that are always available
const DEFAULT_DEVICES = ['Firestick', 'K8', '8X', 'M9', 'R69'];

export function useDeviceTypes() {
  return useQuery({
    queryKey: ['device_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as DeviceType[];
    },
  });
}

// Returns all available device names (defaults + custom)
export function useAllDeviceOptions() {
  const { data: customDevices = [] } = useDeviceTypes();
  const customNames = customDevices.map((d) => d.name);
  // Combine defaults with custom, avoiding duplicates
  const allDevices = [...DEFAULT_DEVICES];
  customNames.forEach((name) => {
    if (!allDevices.includes(name)) {
      allDevices.push(name);
    }
  });
  return allDevices;
}

export function useCreateDeviceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: existing } = await supabase
        .from('device_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
      
      const { data, error } = await supabase
        .from('device_types')
        .insert({ name, sort_order: nextOrder, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_types'] });
    },
  });
}

export function useDeleteDeviceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('device_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_types'] });
    },
  });
}
