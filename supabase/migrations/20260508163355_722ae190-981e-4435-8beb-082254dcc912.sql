ALTER TABLE public.app_settings ALTER COLUMN email_provider SET DEFAULT 'brevo';
UPDATE public.app_settings SET email_provider = 'brevo' WHERE email_provider IS DISTINCT FROM 'brevo';