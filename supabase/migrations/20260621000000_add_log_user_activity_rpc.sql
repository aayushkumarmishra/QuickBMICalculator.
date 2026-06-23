-- DROP the insecure insert policy on audit_logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- CREATE the log_user_activity() RPC function
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_entity_uuid UUID;
BEGIN
  -- Securely resolve user_id from the JWT
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Securely resolve user email from the JWT
  v_email := COALESCE(auth.jwt()->>'email', '');
  
  -- Attempt to safely cast the entity ID to a UUID if provided
  IF p_entity_id IS NOT NULL AND p_entity_id <> '' THEN
    BEGIN
      v_entity_uuid := p_entity_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_entity_uuid := NULL;
    END;
  ELSE
    v_entity_uuid := NULL;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    email,
    action,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata,
    status
  ) VALUES (
    v_user_id,
    v_email,
    p_action,
    p_action,
    p_entity_type,
    v_entity_uuid,
    p_description,
    p_metadata,
    'success'
  );
END;
$$;
