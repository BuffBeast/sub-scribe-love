import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockItem {
  id: string;
  name: string;
  category: 'box' | 'remote';
  quantity: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useStockItems() {
  return useQuery({
    queryKey: ['stock_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as StockItem[];
    },
  });
}

export function useCreateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: { name: string; category: string; quantity: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('stock_items')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock_items'] }),
  });
}

export function useUpdateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StockItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('stock_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock_items'] }),
  });
}

export function useDeleteStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stock_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock_items'] }),
  });
}
