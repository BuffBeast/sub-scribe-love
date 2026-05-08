ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS email_provider text NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS brevo_sender_email text,
  ADD COLUMN IF NOT EXISTS brevo_sender_name text;