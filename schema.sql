-- ============================================================================
-- Restaurant Management System — Clean Schema (Trigger-Free Architecture)
-- ============================================================================
-- Run this AFTER drop_triggers.sql in Supabase SQL Editor.
-- This file is idempotent: safe to run on an existing database.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. restaurants
-- Created explicitly by the app after payment, never by a trigger.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    delivery_enabled BOOLEAN NOT NULL DEFAULT false,
    subscription_status TEXT NOT NULL CHECK (
        subscription_status IN ('active', 'expired', 'trial')
    ) DEFAULT 'trial',
    subscription_expires_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 2. users (public profile — lazy-created by the app, NEVER by a trigger)
-- Linked 1-to-1 with auth.users via the same UUID.
-- restaurant_id is nullable: set after the restaurant is created post-checkout.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants (id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (
        role IN (
            'platform_admin',
            'restaurant_owner',
            'restaurant_staff',
            'customer'
        )
    ) DEFAULT 'restaurant_owner',
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    onboarding_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 3. subscriptions
-- Standalone subscription tracking decoupled from restaurants.
-- One subscription per restaurant (one active at a time).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'expired',
            'cancelled',
            'trial'
        )
    ),
    amount_paid DECIMAL(10, 2),
    currency TEXT NOT NULL DEFAULT 'NGN',
    flutterwave_tx_ref TEXT UNIQUE,
    flutterwave_tx_id TEXT,
    period_start TIMESTAMP
    WITH
        TIME ZONE NOT NULL DEFAULT NOW(),
        period_end TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 4. tables (for QR dine-in ordering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    qr_code_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (
        status IN ('available', 'occupied')
    ) DEFAULT 'available',
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (restaurant_id, table_number)
);

-- 5. menu_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 6. menu_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    quantity INTEGER,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 7. orders
-- customer_id is nullable: anonymous orders (dine-in/online without account) are supported.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
    table_id UUID REFERENCES public.tables (id) ON DELETE SET NULL,
    order_type TEXT NOT NULL CHECK (
        order_type IN (
            'online',
            'preorder',
            'dine_in'
        )
    ),
    status TEXT NOT NULL CHECK (
        status IN (
            'pending_payment',
            'awaiting_confirmation',
            'confirmed',
            'preparing',
            'ready',
            'completed',
            'cancelled'
        )
    ) DEFAULT 'pending_payment',
    delivery_method TEXT CHECK (
        delivery_method IN (
            'delivery',
            'pickup',
            'dine_in'
        )
    ),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_reference TEXT,
    payment_proof_url TEXT,
    buyer_transfer_name TEXT,
    note TEXT,
    delivery_address TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 8. order_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 9. pending_restaurants (server-side fallback for checkout data when Flutterwave meta is unavailable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pending_restaurants (
    tx_ref TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    restaurant_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT(NOW() + INTERVAL '2 hours')
);

-- ============================================================================
-- ADD MISSING COLUMNS (safe ALTER — idempotent approach)
-- ============================================================================

DO $$
BEGIN
  -- restaurants: add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='description') THEN
    ALTER TABLE public.restaurants ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='logo_url') THEN
    ALTER TABLE public.restaurants ADD COLUMN logo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='banner_url') THEN
    ALTER TABLE public.restaurants ADD COLUMN banner_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='delivery_enabled') THEN
    ALTER TABLE public.restaurants ADD COLUMN delivery_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='updated_at') THEN
    ALTER TABLE public.restaurants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- users: add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='onboarding_complete') THEN
    ALTER TABLE public.users ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- orders: add delivery_address if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
    ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- menu_items: add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='updated_at') THEN
    ALTER TABLE public.menu_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- menu_categories: add sort_order if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='sort_order') THEN
    ALTER TABLE public.menu_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pending_restaurants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- Drop existing policies before recreating to keep this file idempotent.
-- ============================================================================

-- ── users ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_select_own" ON public.users;

DROP POLICY IF EXISTS "users_insert_own" ON public.users;

DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Users can read their own profile
CREATE POLICY "users_select_own" ON public.users FOR
SELECT USING (auth.uid () = id);

-- Users can insert their own profile (self-registration only)
CREATE POLICY "users_insert_own" ON public.users FOR
INSERT
WITH
    CHECK (auth.uid () = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users FOR
UPDATE USING (auth.uid () = id);

-- ── restaurants ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "restaurants_public_select" ON public.restaurants;

DROP POLICY IF EXISTS "restaurants_owner_insert" ON public.restaurants;

DROP POLICY IF EXISTS "restaurants_owner_update" ON public.restaurants;

DROP POLICY IF EXISTS "restaurants_owner_delete" ON public.restaurants;

-- Anyone can read restaurant info (needed for public menu pages)
CREATE POLICY "restaurants_public_select" ON public.restaurants FOR
SELECT USING (true);

-- Only authenticated users can create a restaurant
-- (The API route validates ownership; the RLS just ensures auth)
CREATE POLICY "restaurants_owner_insert" ON public.restaurants FOR
INSERT
WITH
    CHECK (auth.uid () IS NOT NULL);

-- Owners can update their own restaurant
CREATE POLICY "restaurants_owner_update" ON public.restaurants FOR
UPDATE USING (
    id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- Owners can delete their own restaurant
CREATE POLICY "restaurants_owner_delete" ON public.restaurants FOR DELETE USING (
    id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- ── subscriptions ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "subscriptions_owner_all" ON public.subscriptions;

CREATE POLICY "subscriptions_owner_all" ON public.subscriptions FOR ALL USING (user_id = auth.uid ());

-- ── tables ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tables_public_select" ON public.tables;

DROP POLICY IF EXISTS "tables_owner_all" ON public.tables;

CREATE POLICY "tables_public_select" ON public.tables FOR
SELECT USING (true);

CREATE POLICY "tables_owner_all" ON public.tables FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- ── menu_categories ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "menu_categories_public_select" ON public.menu_categories;

DROP POLICY IF EXISTS "menu_categories_owner_all" ON public.menu_categories;

CREATE POLICY "menu_categories_public_select" ON public.menu_categories FOR
SELECT USING (true);

CREATE POLICY "menu_categories_owner_all" ON public.menu_categories FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- ── menu_items ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "menu_items_public_select" ON public.menu_items;

DROP POLICY IF EXISTS "menu_items_owner_all" ON public.menu_items;

CREATE POLICY "menu_items_public_select" ON public.menu_items FOR
SELECT USING (true);

CREATE POLICY "menu_items_owner_all" ON public.menu_items FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- ── orders ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;

DROP POLICY IF EXISTS "orders_owner_all" ON public.orders;

-- Anyone can place an order (anonymous + authenticated)
CREATE POLICY "orders_public_insert" ON public.orders FOR
INSERT
WITH
    CHECK (true);

-- Restaurant owners can view and manage all orders for their restaurant
CREATE POLICY "orders_owner_all" ON public.orders FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id
        FROM public.users
        WHERE
            id = auth.uid ()
    )
);

-- ── order_items ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;

DROP POLICY IF EXISTS "order_items_owner_all" ON public.order_items;

-- Public insert (anyone placing an order)
CREATE POLICY "order_items_public_insert" ON public.order_items FOR
INSERT
WITH
    CHECK (true);

-- Owners can read/manage order items for their restaurant
CREATE POLICY "order_items_owner_all" ON public.order_items FOR ALL USING (
    order_id IN (
        SELECT o.id
        FROM public.orders o
        WHERE
            o.restaurant_id IN (
                SELECT restaurant_id
                FROM public.users
                WHERE
                    id = auth.uid ()
            )
    )
);

-- ── pending_restaurants ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pending_restaurants_owner_select" ON public.pending_restaurants;

DROP POLICY IF EXISTS "pending_restaurants_owner_insert" ON public.pending_restaurants;

DROP POLICY IF EXISTS "pending_restaurants_owner_delete" ON public.pending_restaurants;

CREATE POLICY "pending_restaurants_owner_select" ON public.pending_restaurants FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "pending_restaurants_owner_insert" ON public.pending_restaurants FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Allow deletion (cleanup after payment)
CREATE POLICY "pending_restaurants_owner_delete" ON public.pending_restaurants FOR DELETE USING (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON public.users (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants (slug);

CREATE INDEX IF NOT EXISTS idx_restaurants_sub_status ON public.restaurants (subscription_status);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON public.subscriptions (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tx_ref ON public.subscriptions (flutterwave_tx_ref);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

-- tables
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables (restaurant_id);

-- menu_categories
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories (restaurant_id);

-- menu_items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items (category_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items (available);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items (menu_item_id);

-- pending_restaurants
CREATE INDEX IF NOT EXISTS idx_pending_restaurants_user_id ON public.pending_restaurants (user_id);

CREATE INDEX IF NOT EXISTS idx_pending_restaurants_expires_at ON public.pending_restaurants (expires_at);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Tables created (trigger-free):
--   users, restaurants, subscriptions, tables,
--   menu_categories, menu_items, orders, order_items, pending_restaurants
--
-- Onboarding flow:
--   1. supabase.auth.signUp()          → auth.users row
--   2. POST /api/auth/create-user      → public.users row (UPSERT, instant)
--   3. User fills checkout form        → POST /api/checkout → Flutterwave redirect
--   4. Payment succeeds                → GET /api/callback/flutterwave
--   5. Callback creates restaurant     → restaurants row + users.restaurant_id set
--   6. Redirect to /onboarding/success → instant, no polling
-- ============================================================================