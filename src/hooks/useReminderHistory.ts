import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReminderHistoryEntry {
  id: string;
  user_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  reminder_type: string;
  plan_description: string | null;
  expiry_date: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function useReminderHistory(limit = 50) {
  return useQuery({
    queryKey: ['reminder-history', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('reminder_history')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ReminderHistoryEntry[];
    },
  });
}
