import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('User')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_id, organization_id } = await req.json();

    if (!user_id || !organization_id) {
      return Response.json({ error: 'user_id and organization_id are required' }, { status: 400 });
    }

    const { data: targetUsers } = await supabase
      .from('User')
      .select('*')
      .eq('organization_id', organization_id);

    const targetUser = (targetUsers || []).find((u: any) => u.id === user_id);

    if (!targetUser) {
      return Response.json({ error: 'User not found in this organization' }, { status: 404 });
    }

    if (targetUser.email === authUser.email) {
      return Response.json({ error: 'Cannot remove your own access' }, { status: 400 });
    }

    await supabase
      .from('User')
      .update({ organization_id: '', organization_name: '' })
      .eq('id', user_id);

    try {
      await supabase.from('audit_logs').insert({
        organization_id,
        entity_type: 'SecurityEvent',
        entity_id: `sec_${Date.now()}`,
        entity_title: 'Access Removed',
        action: 'access_removed',
        actor_email: authUser.email,
        actor_name: profile?.full_name || authUser.email,
        actor_role: profile?.role || 'admin',
        timestamp: new Date().toISOString(),
        notes: `Removed access for ${targetUser.full_name || targetUser.email} (was ${targetUser.role || 'user'})`,
        retention_category: 'compliance',
        retention_years: 5,
        is_locked: true,
        metadata: {
          target_user_email: targetUser.email,
          target_user_name: targetUser.full_name,
          previous_role: targetUser.role || 'user',
        },
      });
    } catch (logErr) {
      console.warn('Audit log failed:', (logErr as Error).message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});