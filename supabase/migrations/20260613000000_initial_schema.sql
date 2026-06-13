-- 1. PROFILES
-- Purpose: User profile linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. TRACKER PROFILES
-- Purpose: One user can track multiple people.
CREATE TABLE IF NOT EXISTS public.tracker_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_name TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('self', 'family', 'friend', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tracker_profiles ENABLE ROW LEVEL SECURITY;

-- 3. HEALTH REPORTS
-- Purpose: Store ONLY manually saved reports.
CREATE TABLE IF NOT EXISTS public.health_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tracker_profile_id UUID REFERENCES public.tracker_profiles(id) ON DELETE CASCADE NOT NULL,
    calculator_type TEXT NOT NULL CHECK (calculator_type IN ('bmi', 'bmr', 'calorie', 'ideal_weight', 'water_intake')),
    input_json JSONB NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles: Users can only view and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Tracker Profiles: Users can only manage their own tracker profiles
CREATE POLICY "Users can view own tracker profiles" 
ON public.tracker_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracker profiles" 
ON public.tracker_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracker profiles" 
ON public.tracker_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracker profiles" 
ON public.tracker_profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Health Reports: Users can only manage their own reports
CREATE POLICY "Users can view own health reports" 
ON public.health_reports FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health reports" 
ON public.health_reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health reports" 
ON public.health_reports FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health reports" 
ON public.health_reports FOR DELETE 
USING (auth.uid() = user_id);

-- AUTOMATION: Profile creation on Signup
-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tracker_profiles_user_id ON public.tracker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_user_id ON public.health_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_tracker_profile_id ON public.health_reports(tracker_profile_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_calculator_type ON public.health_reports(calculator_type);
