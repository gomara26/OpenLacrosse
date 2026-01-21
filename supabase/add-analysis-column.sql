-- Add recruiting_analysis column to player_profiles table
ALTER TABLE player_profiles 
  ADD COLUMN IF NOT EXISTS recruiting_analysis JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_player_profiles_recruiting_analysis 
  ON player_profiles(id) 
  WHERE recruiting_analysis IS NOT NULL;
