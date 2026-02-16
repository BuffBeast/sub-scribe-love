import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ColumnVisibility {
  id: string;
  column_name: string;
  is_visible: boolean;
  sort_order: number;
}

export const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  service: 'Service',
  has_trial: 'Trial',
  company: 'Notes',
  subscription_status: 'Status',
  subscription_plan: 'LIVE',
  subscription_end_date: 'LIVE Expiry',
  vod_plan: 'VOD',
  vod_end_date: 'VOD Expiry',
  device: 'Device',
  reminders_enabled: 'Reminders',
  last_contact_date: 'Last Contact',
  total_spent: 'Total Spent',
};

export const DEFAULT_COLUMN_ORDER = [
  'name', 'email', 'phone', 'service', 'has_trial',
  'subscription_plan', 'subscription_end_date',
  'vod_plan', 'vod_end_date',
  'company', 'device', 'subscription_status', 'reminders_enabled',
  'last_contact_date', 'total_spent',
];

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

/** Returns columns in the user's preferred order, merging DB records with defaults. */
export function useOrderedColumns() {
  const { data: columns = [] } = useColumnVisibility();

  const colMap = new Map(columns.map((c) => [c.column_name, c]));

  // Build merged list with sort_order
  const merged = DEFAULT_COLUMN_ORDER.map((col, idx) => {
    const existing = colMap.get(col);
    return {
      column_name: col,
      is_visible: existing ? existing.is_visible : true,
      sort_order: existing?.sort_order ?? idx,
      label: COLUMN_LABELS[col] || col,
    };
  });

  // Sort by sort_order
  merged.sort((a, b) => a.sort_order - b.sort_order);
  return merged;
}

export function useUpdateColumnVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ column_name, is_visible }: { column_name: string; is_visible: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
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

export function useUpdateColumnOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedColumns: { column_name: string; sort_order: number }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert all column orders
      const upserts = orderedColumns.map((col) => ({
        column_name: col.column_name,
        sort_order: col.sort_order,
        user_id: user.id,
        is_visible: true, // default, will be overridden by existing
      }));

      // We need to handle this carefully: update existing, insert new
      for (const col of orderedColumns) {
        const { data: existing } = await supabase
          .from('column_visibility')
          .select('id')
          .eq('column_name', col.column_name)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('column_visibility')
            .update({ sort_order: col.sort_order })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('column_visibility')
            .insert({
              column_name: col.column_name,
              sort_order: col.sort_order,
              user_id: user.id,
              is_visible: true,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column_visibility'] });
    },
  });
}
