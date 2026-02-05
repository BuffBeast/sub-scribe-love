-- Add custom reminder message column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN reminder_subject text DEFAULT 'Your subscription expires in 30 days',
ADD COLUMN reminder_message text DEFAULT 'Hi {name},

Your {plan} subscription expires on {date}.

Please renew to continue your service.

Thank you!';