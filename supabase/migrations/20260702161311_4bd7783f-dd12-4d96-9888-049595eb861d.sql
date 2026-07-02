
-- Private table for third-party credentials. No SELECT policy for authenticated
-- users — the value can only be read by service-role edge functions.
CREATE TABLE IF NOT EXISTS public.user_email_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brevo_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, UPDATE, DELETE ON public.user_email_credentials TO authenticated;
GRANT ALL ON public.user_email_credentials TO service_role;

ALTER TABLE public.user_email_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own email credentials"
  ON public.user_email_credentials
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own email credentials"
  ON public.user_email_credentials
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own email credentials"
  ON public.user_email_credentials
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
-- Intentionally NO SELECT policy: the API key must never be readable by the client.

-- Migrate existing keys out of app_settings
INSERT INTO public.user_email_credentials (user_id, brevo_api_key)
SELECT user_id, brevo_api_key
FROM public.app_settings
WHERE brevo_api_key IS NOT NULL AND user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET brevo_api_key = EXCLUDED.brevo_api_key,
      updated_at = now();

-- Drop the sensitive column from the user-readable table
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS brevo_api_key;

-- Helper so the client can know whether the user has a saved key without ever
-- reading the value.
CREATE OR REPLACE FUNCTION public.has_brevo_api_key()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_email_credentials
    WHERE user_id = auth.uid()
      AND brevo_api_key IS NOT NULL
      AND length(brevo_api_key) > 0
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_brevo_api_key() TO authenticated;
