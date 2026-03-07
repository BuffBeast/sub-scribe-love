
DROP POLICY "Service role can insert reminder_history" ON public.reminder_history;

CREATE POLICY "Authenticated users can insert their own reminder_history"
  ON public.reminder_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
