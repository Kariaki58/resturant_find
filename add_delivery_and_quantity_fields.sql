-- Add delivery and quantity fields
-- Run this in your Supabase SQL Editor

-- Add delivery_enabled to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false;

-- Add quantity to menu_items table (optional, null means unlimited)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT NULL;

-- Add delivery_method to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('delivery', 'pickup', 'dine_in')) DEFAULT 'pickup';

-- Add comments
COMMENT ON COLUMN public.restaurants.delivery_enabled IS 'Whether the restaurant offers delivery service';
COMMENT ON COLUMN public.menu_items.quantity IS 'Available quantity of this menu item. NULL means unlimited.';
COMMENT ON COLUMN public.orders.delivery_method IS 'Whether the order is for delivery or pickup';

