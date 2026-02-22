-- ============================================================================
-- Fix RLS Policies for User Registration
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the registration issue
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.users;

-- Recreate users table policies
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- IMPORTANT: Allow users to insert their own record during registration
-- This policy allows authenticated users to create their own user record
-- The WITH CHECK ensures they can only insert a record with their own ID
CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: Server-side operations (using service role) bypass RLS automatically
-- Client-side operations need the policy above to work

-- ============================================================================
-- Verify policies are created
-- ============================================================================
-- You can check with: SELECT * FROM pg_policies WHERE tablename = 'users';
-- 
-- After running this, try registering again. The error should be fixed.
