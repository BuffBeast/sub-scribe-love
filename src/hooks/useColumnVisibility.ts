import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomFields, CustomField } from '@/hooks/useCustomFields';

export interface ColumnVisibility {
  id: string;
  column_name: string;
  is_visible: boolean;
  sort_order: number;
  column_width: number | null;
}

export const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  service: 'Service',
  has_live_trial: 'LIVE Trial',
  has_vod_trial: 'VOD Trial',
  company: 'Notes',
  subscription_status: 'Status',
  subscription_plan: 'LIVE',
  subscription_end_date: 'LIVE Expiry',
  vod_plan: 'VOD',
  vod_end_date: 'VOD Expiry',
  device: 'Device',
  connections: 'Conn.',
  selected_addons: 'Add-Ons',
  reminders_enabled: 'Reminders',
  last_contact_date: 'Last Contact',
  total_spent: 'Total Spent',
};

export const DEFAULT_COLUMN_ORDER = [
  'name', 'email', 'phone', 'service',
  'subscription_plan', 'has_live_trial', 'subscription_end_date',
  'vod_plan', 'has_vod_trial', 'vod_end_date',
  'company', 'device', 'connections', 'selected_addons', 'subscription_status', 'reminders_enabled',
  'last_contact_date', 'total_spent',
];

export interface UnifiedColumn {
  /** For built-in: column key. For custom: `custom_${id}` */
  id: string;
  column_name: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
  type: 'builtin' | 'custom';
  /** Only for custom fields */
  customField?: CustomField;
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

/**
 * Returns a unified, ordered list of ALL columns (built-in + custom fields).
 * Custom fields are interleaved with built-in columns based on sort_order.
 */
export function useOrderedColumns(): UnifiedColumn[] {
  const { data: columns = [] } = useColumnVisibility();
  const { data: customFields = [] } = useCustomFields();

  const colMap = new Map(columns.map((c) => [c.column_name, c]));

  // Built-in columns
  const builtinCols: UnifiedColumn[] = DEFAULT_COLUMN_ORDER.map((col, idx) => {
    const existing = colMap.get(col);
    return {
      id: col,
      column_name: col,
      label: COLUMN_LABELS[col] || col,
      is_visible: existing ? existing.is_visible : true,
      sort_order: existing?.sort_order ?? idx,
      type: 'builtin',
    };
  });

  // Custom field columns - use column_visibility for sort_order if available,
  // otherwise place after built-in columns
  const customCols: UnifiedColumn[] = customFields.map((field, idx) => {
    const colKey = `custom_${field.id}`;
    const existing = colMap.get(colKey);
    return {
      id: colKey,
      column_name: colKey,
      label: field.name,
      is_visible: existing ? existing.is_visible : field.is_visible,
      sort_order: existing?.sort_order ?? (DEFAULT_COLUMN_ORDER.length + field.sort_order),
      type: 'custom',
      customField: field,
    };
  });

  const all = [...builtinCols, ...customCols];
  all.sort((a, b) => a.sort_order - b.sort_order);
  return all;
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

      // Batch upsert all column orders in a single query
      const rows = orderedColumns.map(col => ({
        column_name: col.column_name,
        sort_order: col.sort_order,
        user_id: user.id,
        is_visible: true,
      }));

      const { error } = await supabase
        .from('column_visibility')
        .upsert(rows, { onConflict: 'column_name,user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column_visibility'] });
    },
  });
}
