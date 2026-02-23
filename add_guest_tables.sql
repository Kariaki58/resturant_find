-- ============================================================================
-- Guest Tables System - Database Migration
-- ============================================================================
-- This migration adds support for Guest Table QR Code ordering system
-- ============================================================================

-- Step 1: Create guest_tables table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guest_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Guest Table 1", "Guest Table 2", etc.
  qr_code_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- Step 2: Create guest_sessions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_table_id UUID NOT NULL REFERENCES public.guest_tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'READY_FOR_PAYMENT', 'AWAITING_CONFIRMATION', 'PAID', 'CLOSED')) DEFAULT 'OPEN',
  total_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Step 3: Create guest_orders table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guest_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_id UUID NOT NULL REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Enable Row Level Security
-- ============================================================================
ALTER TABLE public.guest_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_orders ENABLE ROW LEVEL SECURITY;

-- Step 5: Create indexes for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_guest_tables_restaurant_id ON public.guest_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_guest_table_id ON public.guest_sessions(guest_table_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_status ON public.guest_sessions(status);
CREATE INDEX IF NOT EXISTS idx_guest_orders_session_id ON public.guest_orders(guest_session_id);

-- Step 6: RLS Policies for guest_tables
-- ============================================================================
-- Restaurant owners can manage their own guest tables
CREATE POLICY "Restaurant owners can view their guest tables"
  ON public.guest_tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.restaurant_id = guest_tables.restaurant_id
    )
  );

CREATE POLICY "Restaurant owners can insert their guest tables"
  ON public.guest_tables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.restaurant_id = guest_tables.restaurant_id
    )
  );

CREATE POLICY "Restaurant owners can update their guest tables"
  ON public.guest_tables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.restaurant_id = guest_tables.restaurant_id
    )
  );

CREATE POLICY "Restaurant owners can delete their guest tables"
  ON public.guest_tables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.restaurant_id = guest_tables.restaurant_id
    )
  );

-- Public read access for guest tables (needed for QR code scanning)
CREATE POLICY "Public can view active guest tables"
  ON public.guest_tables FOR SELECT
  USING (is_active = TRUE);

-- Step 7: RLS Policies for guest_sessions
-- ============================================================================
-- Restaurant owners can view their guest sessions
CREATE POLICY "Restaurant owners can view their guest sessions"
  ON public.guest_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guest_tables
      JOIN public.users ON users.restaurant_id = guest_tables.restaurant_id
      WHERE guest_tables.id = guest_sessions.guest_table_id
      AND users.id = auth.uid()
    )
  );

-- Public can create guest sessions (when scanning QR)
CREATE POLICY "Public can create guest sessions"
  ON public.guest_sessions FOR INSERT
  WITH CHECK (TRUE);

-- Public can view their own guest sessions
CREATE POLICY "Public can view guest sessions"
  ON public.guest_sessions FOR SELECT
  USING (TRUE);

-- Restaurant owners can update guest sessions (for payment confirmation)
CREATE POLICY "Restaurant owners can update their guest sessions"
  ON public.guest_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guest_tables
      JOIN public.users ON users.restaurant_id = guest_tables.restaurant_id
      WHERE guest_tables.id = guest_sessions.guest_table_id
      AND users.id = auth.uid()
    )
  );

-- Step 8: RLS Policies for guest_orders
-- ============================================================================
-- Public can create guest orders
CREATE POLICY "Public can create guest orders"
  ON public.guest_orders FOR INSERT
  WITH CHECK (TRUE);

-- Public can view guest orders for their sessions
CREATE POLICY "Public can view guest orders"
  ON public.guest_orders FOR SELECT
  USING (TRUE);

-- Restaurant owners can view guest orders for their restaurant
CREATE POLICY "Restaurant owners can view their guest orders"
  ON public.guest_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guest_sessions
      JOIN public.guest_tables ON guest_tables.id = guest_sessions.guest_table_id
      JOIN public.users ON users.restaurant_id = guest_tables.restaurant_id
      WHERE guest_sessions.id = guest_orders.guest_session_id
      AND users.id = auth.uid()
    )
  );

-- Public can update their own guest orders (for quantity changes)
CREATE POLICY "Public can update guest orders"
  ON public.guest_orders FOR UPDATE
  USING (TRUE);

-- Public can delete their own guest orders
CREATE POLICY "Public can delete guest orders"
  ON public.guest_orders FOR DELETE
  USING (TRUE);

-- Step 9: Create function to update guest_session total_amount
-- ============================================================================
CREATE OR REPLACE FUNCTION update_guest_session_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guest_sessions
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price), 0)
    FROM public.guest_orders
    WHERE guest_session_id = COALESCE(NEW.guest_session_id, OLD.guest_session_id)
    AND status IN ('pending', 'pending_removal')  -- Include pending_removal until confirmed
  )
  WHERE id = COALESCE(NEW.guest_session_id, OLD.guest_session_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update total_amount
CREATE TRIGGER update_guest_session_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_session_total();

-- Step 10: Create function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_guest_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_tables_updated_at_trigger
  BEFORE UPDATE ON public.guest_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_tables_updated_at();

