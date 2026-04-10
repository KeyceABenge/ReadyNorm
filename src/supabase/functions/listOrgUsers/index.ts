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

    const callerEmail = authUser.email!;

    // Parse body first so we can scope the access check to the specific org
    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id);
    const org = orgs?.[0];

    // Authorization: caller must be the org creator OR an active member of the
    // org_group that owns this org with a manager-level role.
    const isOrgCreator = org?.created_by?.toLowerCase() === callerEmail.toLowerCase();
    let isOrgMember = false;
    if (!isOrgCreator && org?.org_group_id) {
      const { data: callerMemberships } = await supabase
        .from('org_group_memberships')
        .select('role')
        .eq('org_group_id', org.org_group_id)
        .eq('user_email', callerEmail)
        .eq('status', 'active');
      isOrgMember = (callerMemberships || []).some((m: any) =>
        ['org_owner', 'org_manager', 'site_manager'].includes(m.role)
      );
    }
    if (!isOrgCreator && !isOrgMember) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const siteCode = org?.site_code;

    const usersMap = new Map();

    if (org?.org_group_id) {
      const { data: memberships } = await supabase
        .from('org_group_memberships')
        .select('*')
        .eq('org_group_id', org.org_group_id)
        .eq('status', 'active');

      const relevantMemberships = (memberships || []).filter((m: any) => {
        // Treat null/undefined site_access_type as "all" (legacy memberships
        // created before the field existed should default to full access)
        if (!m.site_access_type || m.site_access_type === "all") return true;
        if (m.site_access_type === "selected" && m.allowed_site_ids?.includes(organization_id)) return true;
        return false;
      });

      for (const membership of relevantMemberships) {
        if (!usersMap.has(membership.user_email)) {
          usersMap.set(membership.user_email, {
            id: membership.id,
            full_name: membership.user_name || membership.user_email,
            email: membership.user_email,
            role: membership.role || 'manager',
            type: 'manager',
            created_date: membership.created_date,
          });
        }
      }
    }

    const { data: directUsers } = await supabase
      .from('User')
      .select('*')
      .eq('organization_id', organization_id);

    for (const u of (directUsers || [])) {
      if (!usersMap.has(u.email)) {
        usersMap.set(u.email, {
          id: u.id,
          full_name: u.full_name || u.email,
          email: u.email,
          role: u.role || 'user',
          type: 'manager',
          created_date: u.created_date,
        });
      }
    }

    // Always guarantee the org group owner appears in the list, even if they
    // have no org_group_memberships row (legacy accounts, or row was never created).
    if (org?.org_group_id) {
      const { data: orgGroups } = await supabase
        .from('organization_groups')
        .select('id, owner_email, owner_name, created_date')
        .eq('id', org.org_group_id);
      const orgGrp = orgGroups?.[0];
      if (orgGrp?.owner_email) {
        const ownerEmail = orgGrp.owner_email.toLowerCase();
        const alreadyIn = [...usersMap.values()].some(
          (u: any) => u.email?.toLowerCase() === ownerEmail
        );
        if (!alreadyIn) {
          usersMap.set(ownerEmail, {
            id: `grp-owner-${orgGrp.id}`,
            full_name: orgGrp.owner_name || orgGrp.owner_email,
            email: orgGrp.owner_email,
            role: 'org_owner',
            type: 'manager',
            created_date: orgGrp.created_date,
          });
        }
      }
    }

    // Also guarantee the org creator appears (handles orgs with no org_group_id).
    if (org?.created_by) {
      const creatorEmail = org.created_by.toLowerCase();
      const alreadyIn = [...usersMap.values()].some(
        (u: any) => u.email?.toLowerCase() === creatorEmail
      );
      if (!alreadyIn) {
        usersMap.set(creatorEmail, {
          id: `org-creator-${org.id}`,
          full_name: org.created_by.split('@')[0],
          email: org.created_by,
          role: 'org_owner',
          type: 'manager',
          created_date: org.created_date,
        });
      }
    }

    const { data: approvedRequests } = await supabase
      .from('access_requests')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('status', 'approved');

    let approvedBySiteCode: any[] = [];
    if (siteCode) {
      const { data } = await supabase
        .from('access_requests')
        .select('*')
        .eq('site_code', siteCode)
        .eq('status', 'approved');
      approvedBySiteCode = data || [];
    }

    const allApproved = [...(approvedRequests || [])];
    for (const ar of approvedBySiteCode) {
      if (!allApproved.find((a: any) => a.id === ar.id)) {
        allApproved.push(ar);
      }
    }

    const approvedByEmail = new Map();
    for (const ar of allApproved) {
      const existing = approvedByEmail.get(ar.requester_email);
      if (!existing || new Date(ar.reviewed_at) > new Date(existing.reviewed_at)) {
        approvedByEmail.set(ar.requester_email, ar);
      }
    }

    for (const [email, ar] of approvedByEmail) {
      if (!usersMap.has(email)) {
        usersMap.set(email, {
          id: ar.id,
          full_name: ar.requester_name || email,
          email: email,
          role: ar.requested_role || 'employee',
          type: 'approved_access',
          approved_at: ar.reviewed_at,
          approved_by: ar.reviewed_by,
          created_date: ar.created_date,
        });
      }
    }

    const users = Array.from(usersMap.values());
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});