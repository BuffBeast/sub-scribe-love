import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceType {
  id: string;
  name: string;
  sort_order: number;
  user_id: string;
  created_at: string;
}

// Default services that are always available
const DEFAULT_SERVICES = ['Spectra', 'Phantomflix', 'ExPat', 'Paranormal'];

export function useServiceTypes() {
  return useQuery({
    queryKey: ['service_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ServiceType[];
    },
  });
}

export function useAllServiceOptions() {
  const { data: customServices = [] } = useServiceTypes();
  return [...DEFAULT_SERVICES, ...customServices.map(s => s.name)];
}

export function useCreateServiceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('service_types')
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_types'] });
    },
  });
}

export function useDeleteServiceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_types'] });
    },
  });
}

export { DEFAULT_SERVICES };
