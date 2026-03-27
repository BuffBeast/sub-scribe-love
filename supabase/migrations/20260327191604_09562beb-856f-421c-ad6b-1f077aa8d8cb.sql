
ALTER TABLE public.customers ADD COLUMN connections integer NOT NULL DEFAULT 1;
ALTER TABLE public.customers ADD COLUMN add_ons integer NOT NULL DEFAULT 0;
ALTER TABLE public.credit_transactions ALTER COLUMN amount TYPE numeric(10,1) USING amount::numeric(10,1);
