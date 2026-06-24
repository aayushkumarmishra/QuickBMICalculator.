-- DEFINITIVE FK FIX: Redirect user_id to auth.users(id)
-- This migration fixes the "violates foreign key constraint 'tracker_profiles_user_id_fkey'" error
-- by ensuring that tracker_profiles and health_reports reference the primary auth table.

-- 1. FIX TRACKER PROFILES
ALTER TABLE public.tracker_profiles
DROP CONSTRAINT IF EXISTS tracker_profiles_user_id_fkey;

ALTER TABLE public.tracker_profiles
ADD CONSTRAINT tracker_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 2. FIX HEALTH REPORTS
ALTER TABLE public.health_reports
DROP CONSTRAINT IF EXISTS health_reports_user_id_fkey;

ALTER TABLE public.health_reports
ADD CONSTRAINT health_reports_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. ENSURE RLS REMAINS FUNCTIONAL
-- RLS policies in earlier migrations already use auth.uid() = user_id.
-- Since user_id now directly references auth.users(id), auth.uid() will match correctly.
