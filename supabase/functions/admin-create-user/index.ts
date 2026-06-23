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
    const { fullName, email, password, role } = body;

    if (!fullName || !email || !password || !role) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['user', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      let message = createError.message || 'Failed to create user';
      if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already exists')) {
        message = 'A user with this email already exists';
      }
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = newUserData.user?.id;

    if (role === 'admin' && newUserId) {
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', newUserId);
      if (updateError) {
        console.error('Failed to set admin role:', updateError);
      }
    }

    await adminClient.from('audit_logs').insert({
      user_id: callerId,
      email: callerEmail,
      action: 'ADMIN_CREATED_USER',
      event_type: 'ADMIN_CREATED_USER',
      entity_type: 'user',
      entity_id: newUserId,
      description: `Admin ${callerEmail} created a new ${role} account for ${email}`,
      metadata: {
        admin_email: callerEmail,
        created_user_email: email,
        created_role: role,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    });

    return new Response(
      JSON.stringify({ success: true, user: { id: newUserId, email, role } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('admin-create-user error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
