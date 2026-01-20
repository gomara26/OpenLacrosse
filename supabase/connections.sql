-- Create school_matches table to track connections between players and coaches
CREATE TABLE IF NOT EXISTS school_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'contacted', 'interested', 'offered')),
  notes TEXT,
  match_score INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(player_id, coach_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_matches_player_id ON school_matches(player_id);
CREATE INDEX IF NOT EXISTS idx_school_matches_coach_id ON school_matches(coach_id);

-- Create trigger for updated_at
CREATE TRIGGER update_school_matches_updated_at BEFORE UPDATE ON school_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE school_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_matches
-- Players can view their own connections
CREATE POLICY "Players can view own connections"
  ON school_matches FOR SELECT
  USING (auth.uid() = player_id);

-- Players can insert their own connections
CREATE POLICY "Players can insert own connections"
  ON school_matches FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Players can update their own connections
CREATE POLICY "Players can update own connections"
  ON school_matches FOR UPDATE
  USING (auth.uid() = player_id);

-- Players can delete their own connections
CREATE POLICY "Players can delete own connections"
  ON school_matches FOR DELETE
  USING (auth.uid() = player_id);

-- Coaches can view connections where they are the coach
CREATE POLICY "Coaches can view connections with them"
  ON school_matches FOR SELECT
  USING (
    public.get_user_role() = 'coach' AND coach_id = auth.uid()
  );
