-- Fix infinite recursion in RLS policies for profiles table
-- Run this in your Supabase SQL Editor

-- Create function to check user role without triggering RLS recursion
-- This function bypasses RLS to prevent infinite recursion in policies
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Coaches can view player profiles" ON profiles;
DROP POLICY IF EXISTS "Players can view coach profiles" ON profiles;
DROP POLICY IF EXISTS "Coaches can view player profiles" ON player_profiles;
DROP POLICY IF EXISTS "Players can view coach profiles" ON coach_profiles;

-- Recreate policies using the security definer function
-- Coaches can read player profiles (for recruiting)
CREATE POLICY "Coaches can view player profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role() = 'coach' AND role = 'player'
  );

-- Players can read coach profiles (for discovery)
CREATE POLICY "Players can view coach profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role() = 'player' AND role = 'coach'
  );

-- Coaches can read player profiles
CREATE POLICY "Coaches can view player profiles"
  ON player_profiles FOR SELECT
  USING (
    public.get_user_role() = 'coach'
  );

-- Players can read coach profiles
CREATE POLICY "Players can view coach profiles"
  ON coach_profiles FOR SELECT
  USING (
    public.get_user_role() = 'player'
  );
