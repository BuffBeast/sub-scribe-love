import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  vod_plan: string | null;
  vod_start_date: string | null;
  vod_end_date: string | null;
  last_contact_date: string | null;
  total_spent: number | null;
  custom_data: Json;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  reminders_enabled: boolean;
  has_trial: boolean;
  has_live_trial: boolean;
  has_vod_trial: boolean;
  device: string | null;
  service: string | null;
}

export function useCustomers() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  // Auto-mark customers as expired when all their subscription end dates have passed
  // AND auto-reactivate expired customers when dates are extended into the future
  useEffect(() => {
    if (!query.data) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toExpire: string[] = [];
    const toReactivate: string[] = [];

    for (const c of query.data) {
      const hasLive = !!c.subscription_plan;
      const hasVod = !!c.vod_plan;
      if (!hasLive && !hasVod) continue;

      const liveExpired = hasLive && c.subscription_end_date && new Date(c.subscription_end_date) < today;
      const vodExpired = hasVod && c.vod_end_date && new Date(c.vod_end_date) < today;
      const liveValid = hasLive && c.subscription_end_date && new Date(c.subscription_end_date) >= today;
      const vodValid = hasVod && c.vod_end_date && new Date(c.vod_end_date) >= today;

      const allExpired = (!hasLive || liveExpired) && (!hasVod || vodExpired);
      const anyValid = liveValid || vodValid;

      // Auto-expire: not already expired/cancelled, all plans past
      if (c.subscription_status !== 'expired' && c.subscription_status !== 'cancelled' && allExpired) {
        toExpire.push(c.id);
      }

      // Auto-reactivate: currently expired, but at least one plan has a future date
      if (c.subscription_status === 'expired' && anyValid) {
        toReactivate.push(c.id);
      }
    }

    const updates: Promise<unknown>[] = [];
    if (toExpire.length > 0) {
      // Single batch update for all customers to expire
      updates.push(
        supabase.from('customers').update({ subscription_status: 'expired' }).in('id', toExpire)
      );
    }
    if (toReactivate.length > 0) {
      // Single batch update for all customers to reactivate
      updates.push(
        supabase.from('customers').update({ subscription_status: 'active' }).in('id', toReactivate)
      );
    }

    if (updates.length > 0) {
      Promise.all(updates).then(() => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      });
    }
  }, [query.data, queryClient]);

  return query;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Omit<Partial<Customer>, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
