-- Add VOD subscription columns to customers table
ALTER TABLE public.customers
ADD COLUMN vod_plan text,
ADD COLUMN vod_start_date date,
ADD COLUMN vod_end_date date;