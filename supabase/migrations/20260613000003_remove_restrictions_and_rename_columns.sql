-- Rename columns to match requested naming convention
ALTER TABLE public.health_reports RENAME COLUMN input_json TO input_data;
ALTER TABLE public.health_reports RENAME COLUMN result_json TO result_data;

-- Remove the unique index that restricted to only one 'self' profile
DROP INDEX IF EXISTS idx_one_self_profile_per_user;

-- Remove the trigger that enforced the 10-profile limit
DROP TRIGGER IF EXISTS enforce_profile_limit ON public.tracker_profiles;
DROP FUNCTION IF EXISTS public.check_tracker_profile_limit();
