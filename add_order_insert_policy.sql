-- Allow customers/public to create orders
-- Run this in your Supabase SQL Editor

-- Allow anyone to insert orders (for customer ordering)
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Allow anyone to insert order items (for customer ordering)
CREATE POLICY "Public can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

