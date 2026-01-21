-- Update school_matches table to have separate coach and athlete statuses
-- First, add the new columns
ALTER TABLE school_matches 
  ADD COLUMN IF NOT EXISTS coach_status TEXT DEFAULT 'good_fit' CHECK (coach_status IN ('good_fit', 'not_good_fit', 'offered')),
  ADD COLUMN IF NOT EXISTS athlete_status TEXT DEFAULT 'interested' CHECK (athlete_status IN ('interested', 'not_good_fit', 'messaged', 'offered'));

-- Migrate existing data: map old status to appropriate new statuses
-- For existing records, set both statuses based on old status
UPDATE school_matches
SET 
  coach_status = CASE 
    WHEN status = 'offered' THEN 'offered'
    WHEN status = 'contacted' THEN 'good_fit'
    WHEN status = 'interested' THEN 'good_fit'
    ELSE 'good_fit'
  END,
  athlete_status = CASE
    WHEN status = 'offered' THEN 'offered'
    WHEN status = 'contacted' THEN 'messaged'
    WHEN status = 'interested' THEN 'interested'
    ELSE 'interested'
  END
WHERE coach_status IS NULL OR athlete_status IS NULL;

-- Create trigger to automatically update athlete_status when coach_status changes
CREATE OR REPLACE FUNCTION update_athlete_status_on_coach_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When coach marks as "offered", athlete status becomes "offered"
  IF NEW.coach_status = 'offered' AND OLD.coach_status != 'offered' THEN
    NEW.athlete_status := 'offered';
  -- When coach marks as "not_good_fit", athlete status becomes "not_good_fit"
  ELSIF NEW.coach_status = 'not_good_fit' AND OLD.coach_status != 'not_good_fit' THEN
    NEW.athlete_status := 'not_good_fit';
  -- When coach sends a message (changes to good_fit from not_good_fit), athlete status becomes "messaged"
  ELSIF NEW.coach_status = 'good_fit' AND OLD.coach_status = 'not_good_fit' THEN
    NEW.athlete_status := 'messaged';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_athlete_status_on_coach_change ON school_matches;
CREATE TRIGGER trigger_update_athlete_status_on_coach_change
  BEFORE UPDATE ON school_matches
  FOR EACH ROW
  WHEN (OLD.coach_status IS DISTINCT FROM NEW.coach_status)
  EXECUTE FUNCTION update_athlete_status_on_coach_change();

-- Update RLS policies to allow coaches to update coach_status
-- Coaches can update their own connections (coach_status)
DROP POLICY IF EXISTS "Coaches can update own connections" ON school_matches;
CREATE POLICY "Coaches can update own connections"
  ON school_matches FOR UPDATE
  USING (
    public.get_user_role() = 'coach' AND coach_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'coach' AND coach_id = auth.uid()
  );

-- Players can update athlete_status to "not_good_fit" only (via "Mark as Not Interested")
-- This allows players to mark themselves as not interested, but status otherwise updates automatically
DROP POLICY IF EXISTS "Players can update own connections" ON school_matches;
CREATE POLICY "Players can update athlete_status to not_good_fit"
  ON school_matches FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (
    auth.uid() = player_id AND 
    (NEW.athlete_status = 'not_good_fit' OR NEW.athlete_status = OLD.athlete_status)
  );

-- Note: Players can SELECT their connections (to see athlete_status)
-- They can only UPDATE athlete_status to "not_good_fit" (via "Mark as Not Interested")
-- All other status updates happen automatically via trigger when coaches change coach_status
