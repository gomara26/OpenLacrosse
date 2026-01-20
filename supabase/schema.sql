-- Open Lacrosse Recruiting Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('player', 'coach')),
  first_name TEXT,
  last_name TEXT,
  profile_photo_url TEXT,
  phone_number TEXT,
  bio TEXT,
  profile_complete BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create player_profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  height TEXT,
  weight_lbs INTEGER,
  high_school TEXT,
  club_team TEXT,
  achievements_awards TEXT,
  highlight_video_url TEXT,
  gpa NUMERIC(3, 2),
  sat_score INTEGER,
  act_score INTEGER,
  academic_interests TEXT,
  division_preference TEXT,
  geographic_preference TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create coach_profiles table
CREATE TABLE IF NOT EXISTS coach_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  coaching_position TEXT NOT NULL,
  division TEXT NOT NULL,
  team_gender TEXT NOT NULL,
  positions_recruiting TEXT,
  target_graduation_years TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_profiles_updated_at BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON coach_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile will be created by the application after role selection
  -- This function is here for future use if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Coaches can read player profiles (for recruiting)
-- Uses security definer function to avoid RLS recursion
CREATE POLICY "Coaches can view player profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role() = 'coach' AND role = 'player'
  );

-- Players can read coach profiles (for discovery)
-- Uses security definer function to avoid RLS recursion
CREATE POLICY "Players can view coach profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role() = 'player' AND role = 'coach'
  );

-- RLS Policies for player_profiles
CREATE POLICY "Users can view own player profile"
  ON player_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own player profile"
  ON player_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own player profile"
  ON player_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Coaches can read player profiles
-- Uses security definer function to avoid RLS recursion
CREATE POLICY "Coaches can view player profiles"
  ON player_profiles FOR SELECT
  USING (
    public.get_user_role() = 'coach'
  );

-- RLS Policies for coach_profiles
CREATE POLICY "Users can view own coach profile"
  ON coach_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own coach profile"
  ON coach_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own coach profile"
  ON coach_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Players can read coach profiles
-- Uses security definer function to avoid RLS recursion
CREATE POLICY "Players can view coach profiles"
  ON coach_profiles FOR SELECT
  USING (
    public.get_user_role() = 'player'
  );

-- Create storage bucket for profile photos
-- Note: Run this in Supabase Dashboard > Storage or via SQL
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Storage policies for profile photos
-- CREATE POLICY "Users can upload own profile photo"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'profile-photos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can update own profile photo"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'profile-photos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete own profile photo"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'profile-photos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Profile photos are publicly viewable"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'profile-photos');
