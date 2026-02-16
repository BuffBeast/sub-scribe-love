-- Drop the incorrect unique constraint on just column_name
ALTER TABLE public.column_visibility DROP CONSTRAINT column_visibility_column_name_key;

-- Add correct unique constraint on (column_name, user_id)
ALTER TABLE public.column_visibility ADD CONSTRAINT column_visibility_column_name_user_id_key UNIQUE (column_name, user_id);