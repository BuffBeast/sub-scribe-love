import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'allocation';
  amount: number;
  customer_id: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
}

export function useCreditTransactions() {
  return useQuery({
    queryKey: ['credit_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as CreditTransaction[]).map(t => ({
        ...t,
        amount: Number(t.amount),
      }));
    },
  });
}

export function useCreditBalance() {
  return useQuery({
    queryKey: ['credit_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('type, amount');
      if (error) throw error;
      return (data as unknown as Pick<CreditTransaction, 'type' | 'amount'>[]).reduce((bal, t) => {
        const amt = Number(t.amount);
        return t.type === 'purchase' ? bal + amt : bal - amt;
      }, 0);
    },
  });
}

export function useAddCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert({ user_id: user.id, type: 'purchase', amount: input.amount, notes: input.notes || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_transactions'] });
      qc.invalidateQueries({ queryKey: ['credit_balance'] });
    },
  });
}

export function useAllocateCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; customer_id: string; customer_name: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          type: 'allocation',
          amount: input.amount,
          customer_id: input.customer_id,
          customer_name: input.customer_name,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_transactions'] });
      qc.invalidateQueries({ queryKey: ['credit_balance'] });
    },
  });
}
