-- ============================================================================
-- Database Trigger to Automatically Create User Record
-- ============================================================================
-- This trigger automatically creates a user record in public.users
-- when a new user signs up in auth.users
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  -- This will only succeed if the user exists in auth.users (foreign key constraint)
  -- We use ON CONFLICT to handle cases where the record already exists
  INSERT INTO public.users (id, full_name, email, phone, role, restaurant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'restaurant_owner',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires after a user is inserted into auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Note: This trigger will automatically create user records
-- You can still manually create users via the API route as a fallback
-- ============================================================================

