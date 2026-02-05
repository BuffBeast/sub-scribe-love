-- Add missing DELETE policy for app_settings
CREATE POLICY "Users can delete their own app settings"
ON public.app_settings FOR DELETE
USING (auth.uid() = user_id);