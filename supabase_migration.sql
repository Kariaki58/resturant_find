-- ============================================================================
-- Restaurant Management System - Database Migration
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: Create restaurants table first (users table references it)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'expired', 'trial')) DEFAULT 'trial',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create users table (references restaurants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'restaurant_owner', 'restaurant_staff', 'customer')) DEFAULT 'restaurant_owner',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create tables table (for QR codes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  qr_code_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied')) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

-- Step 4: Create menu_categories table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create menu_items table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create orders table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('online', 'preorder', 'dine_in')),
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'awaiting_confirmation', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending_payment',
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_reference TEXT,
  payment_proof_url TEXT,
  buyer_transfer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create order_items table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Enable Row Level Security (RLS) on all tables
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Users table policies
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own record during registration
-- This policy allows authenticated users to create their own user record
-- The WITH CHECK ensures they can only insert a record with their own ID
CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Restaurants table policies
CREATE POLICY "Users can view their restaurant"
  ON public.restaurants FOR SELECT
  USING (
    id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their restaurant"
  ON public.restaurants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their restaurant"
  ON public.restaurants FOR UPDATE
  USING (
    id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Allow public read access to restaurants (for menu pages)
CREATE POLICY "Public can view restaurants"
  ON public.restaurants FOR SELECT
  USING (true);

-- Tables policies
CREATE POLICY "Users can manage tables for their restaurant"
  ON public.tables FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Menu categories policies
CREATE POLICY "Users can manage menu categories for their restaurant"
  ON public.menu_categories FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Allow public read access to menu categories (for menu pages)
CREATE POLICY "Public can view menu categories"
  ON public.menu_categories FOR SELECT
  USING (true);

-- Menu items policies
CREATE POLICY "Users can manage menu items for their restaurant"
  ON public.menu_items FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Allow public read access to menu items (for menu pages)
CREATE POLICY "Public can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

-- Orders policies
CREATE POLICY "Users can view orders for their restaurant"
  ON public.orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage orders for their restaurant"
  ON public.orders FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Users can view order items for their restaurant"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE restaurant_id IN (
        SELECT restaurant_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage order items for their restaurant"
  ON public.order_items FOR ALL
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE restaurant_id IN (
        SELECT restaurant_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Create indexes for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON public.users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- Optional: Create pending_restaurants table for temporary storage
-- ============================================================================
-- This table stores restaurant data temporarily during checkout
-- Run this separately if you want the fallback mechanism
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_pending_restaurants_user_id ON public.pending_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_restaurants_expires_at ON public.pending_restaurants(expires_at);

ALTER TABLE public.pending_restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pending restaurants"
  ON public.pending_restaurants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage pending restaurants"
  ON public.pending_restaurants FOR ALL
  USING (true);

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- You should now see 7 tables in your Supabase Table Editor:
-- 1. users
-- 2. restaurants
-- 3. tables
-- 4. menu_categories
-- 5. menu_items
-- 6. orders
-- 7. order_items
-- 
-- Optional: pending_restaurants (for checkout fallback)
-- ============================================================================
