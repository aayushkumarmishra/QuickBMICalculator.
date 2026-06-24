import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerEmail = callerData.user.email;
    const callerId = callerData.user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing target user ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safeguard 1: Admin cannot delete their own account
    if (userId === callerId) {
      return new Response(JSON.stringify({ success: false, error: 'Accidental self-deletion protection: you cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target user profile first
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(JSON.stringify({ success: false, error: 'Target user profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safeguard 2: Last remaining admin cannot be deleted
    if (targetProfile.role === 'admin') {
      const { data: admins, error: countError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (countError) {
        return new Response(JSON.stringify({ success: false, error: 'Error checking admin accounts count' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (admins && admins.length <= 1) {
        return new Response(JSON.stringify({ success: false, error: 'Operation denied: cannot delete the last remaining administrator account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Safeguard 3: Delete Auth User and cascade-delete profiles
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(JSON.stringify({ success: false, error: deleteError.message || 'Failed to delete authentication user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the ADMIN_DELETED_USER action
    await adminClient.from('audit_logs').insert({
      user_id: callerId,
      email: callerEmail,
      action: 'ADMIN_DELETED_USER',
      event_type: 'ADMIN_DELETED_USER',
      entity_type: 'user',
      entity_id: userId,
      description: `Admin ${callerEmail} deleted user account: ${targetProfile.email}`,
      metadata: {
        admin_id: callerId,
        admin_email: callerEmail,
        deleted_user_id: userId,
        deleted_user_email: targetProfile.email,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('admin-delete-user error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
