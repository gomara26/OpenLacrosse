-- Storage Policies for profile-photos bucket
-- Run this in your Supabase SQL Editor after creating the bucket

-- First, make sure the bucket exists (create it in the Storage UI if it doesn't)
-- Then run these policies:

-- Policy: Users can upload their own profile photos
CREATE POLICY "Users can upload own profile photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own profile photos
CREATE POLICY "Users can update own profile photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Profile photos are publicly viewable (if bucket is public)
-- OR use this if you want authenticated-only viewing:
CREATE POLICY "Profile photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');
