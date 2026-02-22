-- Add note field to orders table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add comment
COMMENT ON COLUMN public.orders.note IS 'Optional customer note or special instructions for the order';

