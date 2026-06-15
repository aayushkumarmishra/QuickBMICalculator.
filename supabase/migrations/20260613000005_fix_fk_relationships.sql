-- Fix FK relationships to reference auth.users(id) directly
-- This ensures tracker profiles and health reports can be created even if public.profiles trigger fails or is delayed.

-- 1. TRACKER PROFILES
-- Drop existing FK constraint
ALTER TABLE public.tracker_profiles 
DROP CONSTRAINT IF EXISTS tracker_profiles_user_id_fkey;

-- Add new FK constraint referencing auth.users(id)
ALTER TABLE public.tracker_profiles
ADD CONSTRAINT tracker_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. HEALTH REPORTS
-- Drop existing FK constraint
ALTER TABLE public.health_reports
DROP CONSTRAINT IF EXISTS health_reports_user_id_fkey;

-- Add new FK constraint referencing auth.users(id)
ALTER TABLE public.health_reports
ADD CONSTRAINT health_reports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Verify tracker_profile_id in health_reports (already correct, but ensuring)
-- It should reference tracker_profiles.id
-- (No change needed here as per original schema)
