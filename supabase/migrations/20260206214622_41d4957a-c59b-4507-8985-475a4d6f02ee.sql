-- Add missing DELETE policy for column_visibility table
CREATE POLICY "Users can delete their own column_visibility"
ON public.column_visibility FOR DELETE
USING (auth.uid() = user_id);