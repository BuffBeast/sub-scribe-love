
CREATE POLICY "Users can update their own credit_transactions"
ON public.credit_transactions
FOR UPDATE
TO public
USING (auth.uid() = user_id);
