-- Update the delivery_method constraint to include 'dine_in'
-- Run this in your Supabase SQL Editor if you already ran the previous migration

-- First, drop the existing constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_delivery_method_check;

-- Add the new constraint with all three options
ALTER TABLE public.orders
ADD CONSTRAINT orders_delivery_method_check 
CHECK (delivery_method IN ('delivery', 'pickup', 'dine_in'));

-- Update the comment
COMMENT ON COLUMN public.orders.delivery_method IS 'Order delivery method: delivery, pickup, or dine_in';

