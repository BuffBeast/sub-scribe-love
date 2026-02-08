-- Create analytics_events table for tracking page views
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view their own analytics"
ON public.analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own analytics
CREATE POLICY "Users can insert their own analytics"
ON public.analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own analytics (for cleanup)
CREATE POLICY "Users can delete their own analytics"
ON public.analytics_events
FOR DELETE
USING (auth.uid() = user_id);