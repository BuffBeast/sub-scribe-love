
CREATE TABLE public.reminder_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  reminder_type text NOT NULL DEFAULT 'expiry',
  plan_description text,
  expiry_date date,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminder_history"
  ON public.reminder_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert reminder_history"
  ON public.reminder_history FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_reminder_history_user_id ON public.reminder_history(user_id);
CREATE INDEX idx_reminder_history_sent_at ON public.reminder_history(sent_at DESC);
