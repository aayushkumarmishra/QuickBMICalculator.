import { supabase } from './supabase';

export const logActivity = async (
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata: any = {}
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.rpc('log_user_activity', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_description: description,
      p_metadata: metadata
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
};
