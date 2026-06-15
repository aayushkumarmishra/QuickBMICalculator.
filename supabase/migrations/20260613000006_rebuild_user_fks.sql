-- FORCE REBUILD FKs
-- This migration drops any and all existing foreign key constraints on user_id columns
-- and recreates them referencing auth.users(id) directly.
-- This ensures that tracker profiles and health reports are tied to the authenticated user,
-- not the public.profiles table which might be empty or delayed.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop all foreign keys on public.tracker_profiles(user_id)
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'tracker_profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.tracker_profiles DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;

    -- 2. Drop all foreign keys on public.health_reports(user_id)
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'health_reports' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.health_reports DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

-- 3. Recreate the constraints referencing auth.users(id)
-- Using explicit names to ensure consistency

ALTER TABLE public.tracker_profiles
ADD CONSTRAINT tracker_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.health_reports
ADD CONSTRAINT health_reports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Verify RLS policies are using auth.uid()
-- They already are, but this is the core logic:
-- auth.uid() returns the authenticated user's ID, which now matches the user_id FK target.
