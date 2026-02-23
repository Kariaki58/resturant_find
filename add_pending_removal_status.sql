-- ============================================================================
-- Add pending_removal status to guest_orders
-- ============================================================================
-- This allows items to be marked for removal and require restaurant confirmation
-- ============================================================================

-- Update the status constraint to include 'pending_removal'
ALTER TABLE public.guest_orders
  DROP CONSTRAINT IF EXISTS guest_orders_status_check;

ALTER TABLE public.guest_orders
  ADD CONSTRAINT guest_orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'pending_removal'));

