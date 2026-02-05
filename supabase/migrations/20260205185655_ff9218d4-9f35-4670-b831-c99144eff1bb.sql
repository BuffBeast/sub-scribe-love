-- Add user_id column to customers table
ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to app_settings table
ALTER TABLE public.app_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to custom_fields table
ALTER TABLE public.custom_fields ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to column_visibility table
ALTER TABLE public.column_visibility ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;

DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON public.app_settings;

DROP POLICY IF EXISTS "Anyone can view custom_fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Anyone can insert custom_fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Anyone can update custom_fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Anyone can delete custom_fields" ON public.custom_fields;

DROP POLICY IF EXISTS "Anyone can view column_visibility" ON public.column_visibility;
DROP POLICY IF EXISTS "Anyone can update column_visibility" ON public.column_visibility;

-- Create user-specific RLS policies for customers
CREATE POLICY "Users can view their own customers"
ON public.customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
ON public.customers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
ON public.customers FOR DELETE
USING (auth.uid() = user_id);

-- Create user-specific RLS policies for app_settings
CREATE POLICY "Users can view their own app settings"
ON public.app_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app settings"
ON public.app_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app settings"
ON public.app_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create user-specific RLS policies for custom_fields
CREATE POLICY "Users can view their own custom_fields"
ON public.custom_fields FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom_fields"
ON public.custom_fields FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom_fields"
ON public.custom_fields FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom_fields"
ON public.custom_fields FOR DELETE
USING (auth.uid() = user_id);

-- Create user-specific RLS policies for column_visibility
CREATE POLICY "Users can view their own column_visibility"
ON public.column_visibility FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column_visibility"
ON public.column_visibility FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column_visibility"
ON public.column_visibility FOR UPDATE
USING (auth.uid() = user_id);