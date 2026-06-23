
-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- SET NULL if user is deleted
    event_type TEXT NOT NULL,
    entity_type TEXT, -- e.g., 'user', 'report', 'setting'
    entity_id UUID,   -- ID of the entity affected
    old_value JSONB,  -- old state of the entity (optional)
    new_value JSONB,  -- new state of the entity (optional)
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit_logs: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND public.is_admin_email(email)
  )
);

-- Optional: Index for faster lookup by user_id or created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
