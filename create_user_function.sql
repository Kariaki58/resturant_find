-- ============================================================================
-- Database Function to Create User Record
-- ============================================================================
-- This function allows authenticated users to create their own user record
-- It bypasses RLS by running with SECURITY DEFINER
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_user_record(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  restaurant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    -- Return existing user
    RETURN QUERY
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.restaurant_id
    FROM public.users u
    WHERE u.id = v_user_id;
    RETURN;
  END IF;
  
  -- Insert new user record
  INSERT INTO public.users (id, full_name, email, phone, role, restaurant_id)
  VALUES (v_user_id, p_full_name, p_email, p_phone, 'restaurant_owner', NULL)
  RETURNING users.id, users.full_name, users.email, users.phone, users.role, users.restaurant_id
  INTO id, full_name, email, phone, role, restaurant_id;
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_record TO authenticated;

-- ============================================================================
-- Usage:
-- SELECT * FROM public.create_user_record('John Doe', 'john@example.com', '+1234567890');
-- ============================================================================

