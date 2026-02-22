-- Create a temporary table to store pending restaurant data
-- This ensures we can retrieve restaurant details even if transaction meta is not available

CREATE TABLE IF NOT EXISTS public.pending_restaurants (
  tx_ref TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_restaurants_user_id ON public.pending_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_restaurants_expires_at ON public.pending_restaurants(expires_at);

-- Enable RLS
ALTER TABLE public.pending_restaurants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own pending restaurants
CREATE POLICY "Users can view their pending restaurants"
  ON public.pending_restaurants FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert pending restaurants
CREATE POLICY "System can insert pending restaurants"
  ON public.pending_restaurants FOR INSERT
  WITH CHECK (true);

-- Policy: System can delete pending restaurants
CREATE POLICY "System can delete pending restaurants"
  ON public.pending_restaurants FOR DELETE
  USING (true);

-- Function to clean up expired pending restaurants (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_restaurants()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_restaurants
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

