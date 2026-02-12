
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'box',
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stock_items" ON public.stock_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stock_items" ON public.stock_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stock_items" ON public.stock_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stock_items" ON public.stock_items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
