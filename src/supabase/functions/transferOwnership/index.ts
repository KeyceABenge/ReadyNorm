import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
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

    const { organization_id, new_owner_email } = await req.json();

    if (!organization_id || !new_owner_email) {
      return Response.json({ error: 'organization_id and new_owner_email are required' }, { status: 400 });
    }

    const trimmedEmail = new_owner_email.trim().toLowerCase();

    if (trimmedEmail === authUser.email?.toLowerCase()) {
      return Response.json({ error: 'You are already the owner' }, { status: 400 });
    }

    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id);
    const org = orgs?.[0];
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: newOwnerUsers } = await supabase
      .from('User')
      .select('*')
      .eq('email', trimmedEmail);
    const newOwner = newOwnerUsers?.[0];
    if (!newOwner) {
      return Response.json({ error: 'That email is not a registered user. They must have an account first.' }, { status: 400 });
    }

    if (org.org_group_id) {
      const { data: groups } = await supabase
        .from('organization_groups')
        .select('*')
        .eq('id', org.org_group_id);
      const group = groups?.[0];

      if (group) {
        await supabase
          .from('organization_groups')
          .update({
            owner_email: trimmedEmail,
            owner_name: newOwner.full_name || trimmedEmail,
          })
          .eq('id', group.id);

        const { data: memberships } = await supabase
          .from('org_group_memberships')
          .select('*')
          .eq('org_group_id', org.org_group_id);

        for (const m of (memberships || [])) {
          if (m.user_email?.toLowerCase() === authUser.email?.toLowerCase() && m.role === 'org_owner') {
            await supabase
              .from('org_group_memberships')
              .update({ role: 'org_manager' })
              .eq('id', m.id);
          }
        }

        const existingMembership = (memberships || []).find(
          (m: any) => m.user_email?.toLowerCase() === trimmedEmail
        );

        if (existingMembership) {
          await supabase
            .from('org_group_memberships')
            .update({
              role: 'org_owner',
              site_access_type: 'all',
              status: 'active',
            })
            .eq('id', existingMembership.id);
        } else {
          await supabase
            .from('org_group_memberships')
            .insert({
              org_group_id: org.org_group_id,
              user_email: trimmedEmail,
              user_name: newOwner.full_name || trimmedEmail,
              role: 'org_owner',
              site_access_type: 'all',
              status: 'active',
            });
        }
      }
    }

    await supabase
      .from('User')
      .update({ role: 'admin', organization_id: organization_id })
      .eq('id', newOwner.id);

    return Response.json({
      success: true,
      message: `Ownership transferred to ${trimmedEmail}`,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});