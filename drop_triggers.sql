-- ============================================================================
-- Step 1: Drop the old trigger-based onboarding logic
-- Run this FIRST in Supabase SQL Editor before running schema.sql
-- ============================================================================

-- Drop the trigger that fires on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user ();

-- ============================================================================
-- Done! No more auto-creation of public.users on auth signup.
-- Public.users rows are now created explicitly by the application layer.
-- ============================================================================